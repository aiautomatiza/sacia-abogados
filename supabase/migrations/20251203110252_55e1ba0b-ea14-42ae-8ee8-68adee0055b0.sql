-- Vista detallada de llamadas con joins optimizados
CREATE OR REPLACE VIEW public.v_crm_calls_detailed AS
SELECT
  c.id,
  c.tenant_id,
  c.contact_id,
  c.agent_id,
  c.call_sid,
  c.call_datetime,
  c.type,
  c.state,
  c.end_reason,
  c.duration_seconds,
  c.summary,
  c.transcript,
  c.audio_url,
  c.audio_duration_seconds,
  c.metadata,
  c.created_at,
  c.updated_at,
  
  -- Información del contacto
  co.nombre AS contact_name,
  co.numero AS contact_phone,
  co.attributes AS contact_attributes,
  
  -- Información del tenant
  t.name AS tenant_name,
  
  -- Información del agente
  p.email AS agent_email

FROM public.crm_calls c
INNER JOIN public.crm_contacts co ON c.contact_id = co.id
INNER JOIN public.tenants t ON c.tenant_id = t.id
LEFT JOIN public.profiles p ON c.agent_id = p.id;

-- Función de estadísticas agregadas con tenant isolation
CREATE OR REPLACE FUNCTION public.calculate_calls_stats(
  p_tenant_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_states call_state[] DEFAULT NULL,
  p_types call_type[] DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE(
  total BIGINT,
  pending BIGINT,
  completed BIGINT,
  failed BIGINT,
  missed BIGINT,
  voicemail BIGINT,
  user_hangup BIGINT,
  scheduled BIGINT,
  total_duration NUMERIC,
  avg_duration NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE c.state = 'pending') as pending,
    COUNT(*) FILTER (WHERE c.state = 'completed') as completed,
    COUNT(*) FILTER (WHERE c.state = 'failed') as failed,
    COUNT(*) FILTER (WHERE c.state = 'missed') as missed,
    COUNT(*) FILTER (WHERE c.state = 'voicemail') as voicemail,
    COUNT(*) FILTER (WHERE c.state = 'user_hangup') as user_hangup,
    COUNT(*) FILTER (WHERE c.state = 'scheduled') as scheduled,
    COALESCE(SUM(c.duration_seconds), 0) as total_duration,
    COALESCE(ROUND(AVG(c.duration_seconds), 1), 0) as avg_duration,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((
          COUNT(*) FILTER (WHERE c.state IN ('completed', 'scheduled'))::NUMERIC
          / COUNT(*)::NUMERIC
        ) * 100, 1)
      ELSE 0
    END as completion_rate
  FROM crm_calls c
  LEFT JOIN crm_contacts co ON c.contact_id = co.id
  WHERE
    -- Tenant isolation: usa el tenant del usuario autenticado si no se especifica
    c.tenant_id = COALESCE(p_tenant_id, get_user_tenant_id(auth.uid()))
    AND (p_date_from IS NULL OR c.call_datetime >= p_date_from)
    AND (p_date_to IS NULL OR c.call_datetime <= p_date_to)
    AND (p_states IS NULL OR c.state = ANY(p_states))
    AND (p_types IS NULL OR c.type = ANY(p_types))
    AND (p_search_term IS NULL OR
         co.nombre ILIKE '%' || p_search_term || '%' OR
         co.numero ILIKE '%' || p_search_term || '%');
$$;