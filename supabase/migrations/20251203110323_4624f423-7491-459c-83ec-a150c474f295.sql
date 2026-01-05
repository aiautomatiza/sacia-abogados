-- Recrear vista con SECURITY INVOKER para respetar RLS del usuario
DROP VIEW IF EXISTS public.v_crm_calls_detailed;

CREATE VIEW public.v_crm_calls_detailed
WITH (security_invoker = true)
AS
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