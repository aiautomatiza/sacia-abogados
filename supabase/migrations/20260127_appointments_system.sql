-- ============================================================================
-- SISTEMA DE APPOINTMENTS (CITAS)
-- ============================================================================
-- Este archivo crea el sistema completo de gestión de citas con soporte para:
-- - Citas de llamada (con comercial asignado)
-- - Citas presenciales (con sede asignada)
-- - Multi-sede por tenant
-- ============================================================================

-- ============================================================================
-- PARTE 1: TABLA DE SEDES (tenant_locations)
-- ============================================================================

CREATE TABLE public.tenant_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Informacion basica
    name TEXT NOT NULL,
    code TEXT,

    -- Direccion
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state_province TEXT,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'Espana',

    -- Coordenadas (opcional, para mapas)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Contacto
    phone TEXT,
    email TEXT,

    -- Configuracion
    timezone TEXT DEFAULT 'Europe/Madrid',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Horario de operacion (JSON flexible)
    -- Formato: { "monday": { "open": "09:00", "close": "18:00" }, ... }
    operating_hours JSONB DEFAULT '{}'::jsonb,

    -- Metadata flexible
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT unique_tenant_location_code UNIQUE (tenant_id, code)
);

-- Indices para tenant_locations
CREATE INDEX idx_tenant_locations_tenant ON public.tenant_locations(tenant_id);
CREATE INDEX idx_tenant_locations_active ON public.tenant_locations(tenant_id, is_active);
CREATE INDEX idx_tenant_locations_default ON public.tenant_locations(tenant_id, is_default) WHERE is_default = true;

-- Trigger para updated_at
CREATE TRIGGER update_tenant_locations_updated_at
    BEFORE UPDATE ON public.tenant_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.tenant_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tenant_locations
CREATE POLICY "locations_tenant_access"
    ON public.tenant_locations
    FOR ALL
    USING (tenant_id = get_user_tenant_id(auth.uid()))
    WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "locations_super_admin_all"
    ON public.tenant_locations
    FOR ALL
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================================
-- PARTE 2: ENUMS PARA APPOINTMENTS
-- ============================================================================

-- Tipo de cita
CREATE TYPE public.appointment_type AS ENUM ('call', 'in_person');

-- Estado de cita
CREATE TYPE public.appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
);

-- ============================================================================
-- PARTE 3: TABLA DE APPOINTMENTS
-- ============================================================================

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Tipo de cita
    type public.appointment_type NOT NULL,

    -- Relaciones principales
    contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,

    -- Asignacion segun tipo:
    -- Para 'call': agent_id es el comercial que llamara
    -- Para 'in_person': location_id es la sede
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.tenant_locations(id) ON DELETE SET NULL,

    -- Programacion
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    timezone TEXT DEFAULT 'Europe/Madrid',

    -- Estado
    status public.appointment_status NOT NULL DEFAULT 'scheduled',

    -- Informacion adicional
    title TEXT,
    description TEXT,
    customer_notes TEXT,

    -- Recordatorios
    reminder_sent_at TIMESTAMPTZ,
    confirmation_sent_at TIMESTAMPTZ,

    -- Para citas de llamada
    call_phone_number TEXT,
    call_id UUID REFERENCES public.crm_calls(id) ON DELETE SET NULL,

    -- Metadata flexible
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Auditoria
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,

    -- Constraint: validar asignacion segun tipo
    CONSTRAINT valid_appointment_assignment CHECK (
        (type = 'call' AND agent_id IS NOT NULL) OR
        (type = 'in_person' AND location_id IS NOT NULL)
    )
);

-- Indices optimizados para appointments
CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_contact ON public.appointments(contact_id);
CREATE INDEX idx_appointments_agent ON public.appointments(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_appointments_location ON public.appointments(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_appointments_scheduled ON public.appointments(tenant_id, scheduled_at);
CREATE INDEX idx_appointments_status ON public.appointments(tenant_id, status);
CREATE INDEX idx_appointments_type_status ON public.appointments(tenant_id, type, status);

-- Indice compuesto para queries de calendario (excluye canceladas/reprogramadas)
CREATE INDEX idx_appointments_calendar ON public.appointments(tenant_id, scheduled_at, status)
    WHERE status NOT IN ('cancelled', 'rescheduled');

-- Indice para buscar citas de un contacto
CREATE INDEX idx_appointments_contact_upcoming ON public.appointments(contact_id, scheduled_at)
    WHERE status NOT IN ('cancelled', 'rescheduled', 'completed');

-- Trigger para updated_at
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para appointments
CREATE POLICY "appointments_tenant_access"
    ON public.appointments
    FOR ALL
    USING (tenant_id = get_user_tenant_id(auth.uid()))
    WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "appointments_super_admin_all"
    ON public.appointments
    FOR ALL
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================================
-- PARTE 4: VISTA DETALLADA v_appointments_detailed
-- ============================================================================

CREATE OR REPLACE VIEW public.v_appointments_detailed AS
SELECT
    a.id,
    a.tenant_id,
    a.type,
    a.status,
    a.scheduled_at,
    a.duration_minutes,
    a.timezone,
    a.title,
    a.description,
    a.customer_notes,
    a.call_phone_number,
    a.metadata,
    a.created_at,
    a.updated_at,
    a.cancelled_at,
    a.cancelled_reason,
    a.reminder_sent_at,
    a.confirmation_sent_at,
    a.created_by,

    -- Informacion del contacto
    a.contact_id,
    c.nombre AS contact_name,
    c.numero AS contact_phone,
    c.attributes AS contact_attributes,

    -- Informacion del agente (para citas de llamada)
    a.agent_id,
    p.email AS agent_email,

    -- Informacion de la sede (para citas presenciales)
    a.location_id,
    l.name AS location_name,
    l.address_line1 AS location_address,
    l.city AS location_city,
    l.phone AS location_phone,

    -- Informacion de la llamada vinculada
    a.call_id,
    call.state AS call_state,
    call.duration_seconds AS call_duration,

    -- Campos calculados
    CASE
        WHEN a.status IN ('cancelled', 'rescheduled') THEN 'cancelled'
        WHEN a.status = 'completed' THEN 'past'
        WHEN a.scheduled_at > now() THEN 'upcoming'
        WHEN a.scheduled_at <= now()
             AND a.scheduled_at + (a.duration_minutes || ' minutes')::interval > now() THEN 'ongoing'
        ELSE 'past'
    END AS time_status,

    -- Fin calculado de la cita
    a.scheduled_at + (a.duration_minutes || ' minutes')::interval AS scheduled_end_at

FROM public.appointments a
LEFT JOIN public.crm_contacts c ON a.contact_id = c.id
LEFT JOIN public.profiles p ON a.agent_id = p.id
LEFT JOIN public.tenant_locations l ON a.location_id = l.id
LEFT JOIN public.crm_calls call ON a.call_id = call.id;

-- ============================================================================
-- PARTE 5: FUNCION RPC PARA ESTADISTICAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_appointments_stats(
    p_tenant_id UUID DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_type public.appointment_type DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total BIGINT,
    scheduled BIGINT,
    confirmed BIGINT,
    completed BIGINT,
    cancelled BIGINT,
    no_show BIGINT,
    in_progress BIGINT,
    completion_rate DECIMAL,
    cancellation_rate DECIMAL,
    no_show_rate DECIMAL,
    calls_count BIGINT,
    in_person_count BIGINT,
    avg_duration_minutes DECIMAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Obtener tenant_id del usuario actual si no se proporciona
    IF p_tenant_id IS NULL THEN
        v_tenant_id := get_user_tenant_id(auth.uid());
    ELSE
        -- Verificar que el usuario tenga acceso al tenant
        IF NOT (is_super_admin(auth.uid()) OR p_tenant_id = get_user_tenant_id(auth.uid())) THEN
            RAISE EXCEPTION 'Access denied to tenant %', p_tenant_id;
        END IF;
        v_tenant_id := p_tenant_id;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE a.status = 'scheduled')::BIGINT AS scheduled,
        COUNT(*) FILTER (WHERE a.status = 'confirmed')::BIGINT AS confirmed,
        COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT AS completed,
        COUNT(*) FILTER (WHERE a.status = 'cancelled')::BIGINT AS cancelled,
        COUNT(*) FILTER (WHERE a.status = 'no_show')::BIGINT AS no_show,
        COUNT(*) FILTER (WHERE a.status = 'in_progress')::BIGINT AS in_progress,

        -- Tasa de completado (completadas / total finalizadas)
        COALESCE(
            ROUND(
                (COUNT(*) FILTER (WHERE a.status = 'completed')::DECIMAL /
                 NULLIF(COUNT(*) FILTER (WHERE a.status IN ('completed', 'no_show', 'cancelled')), 0)) * 100,
                2
            ),
            0
        )::DECIMAL AS completion_rate,

        -- Tasa de cancelacion
        COALESCE(
            ROUND(
                (COUNT(*) FILTER (WHERE a.status = 'cancelled')::DECIMAL /
                 NULLIF(COUNT(*), 0)) * 100,
                2
            ),
            0
        )::DECIMAL AS cancellation_rate,

        -- Tasa de no-show
        COALESCE(
            ROUND(
                (COUNT(*) FILTER (WHERE a.status = 'no_show')::DECIMAL /
                 NULLIF(COUNT(*) FILTER (WHERE a.status IN ('completed', 'no_show')), 0)) * 100,
                2
            ),
            0
        )::DECIMAL AS no_show_rate,

        -- Conteo por tipo
        COUNT(*) FILTER (WHERE a.type = 'call')::BIGINT AS calls_count,
        COUNT(*) FILTER (WHERE a.type = 'in_person')::BIGINT AS in_person_count,

        -- Duracion promedio
        COALESCE(ROUND(AVG(a.duration_minutes)::DECIMAL, 1), 0)::DECIMAL AS avg_duration_minutes

    FROM public.appointments a
    WHERE a.tenant_id = v_tenant_id
        AND (p_date_from IS NULL OR a.scheduled_at >= p_date_from)
        AND (p_date_to IS NULL OR a.scheduled_at <= p_date_to)
        AND (p_type IS NULL OR a.type = p_type)
        AND (p_location_id IS NULL OR a.location_id = p_location_id)
        AND (p_agent_id IS NULL OR a.agent_id = p_agent_id);
END;
$$;

-- ============================================================================
-- PARTE 6: MODIFICAR tenant_settings PARA HABILITAR APPOINTMENTS
-- ============================================================================

-- Agregar columna para habilitar appointments
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS appointments_enabled BOOLEAN DEFAULT false;

-- Agregar webhook para appointments (integraciones externas)
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS appointments_webhook_url TEXT;

-- ============================================================================
-- PARTE 7: HABILITAR REALTIME
-- ============================================================================

-- Habilitar realtime para appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Habilitar realtime para tenant_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_locations;

-- ============================================================================
-- PARTE 8: FUNCION HELPER PARA OBTENER PROXIMAS CITAS DE UN CONTACTO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_contact_upcoming_appointments(
    p_contact_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.v_appointments_detailed
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.v_appointments_detailed v
    WHERE v.contact_id = p_contact_id
        AND v.status NOT IN ('cancelled', 'rescheduled', 'completed', 'no_show')
        AND v.scheduled_at > now()
        AND (
            v.tenant_id = get_user_tenant_id(auth.uid())
            OR is_super_admin(auth.uid())
        )
    ORDER BY v.scheduled_at ASC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- PARTE 9: FUNCION PARA VERIFICAR DISPONIBILIDAD
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_appointment_availability(
    p_tenant_id UUID,
    p_type public.appointment_type,
    p_scheduled_at TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_agent_id UUID DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conflict_count INTEGER;
    v_scheduled_end TIMESTAMPTZ;
BEGIN
    v_scheduled_end := p_scheduled_at + (p_duration_minutes || ' minutes')::interval;

    -- Verificar conflictos segun el tipo
    IF p_type = 'call' AND p_agent_id IS NOT NULL THEN
        -- Para llamadas, verificar que el agente no tenga otra cita
        SELECT COUNT(*)
        INTO v_conflict_count
        FROM public.appointments a
        WHERE a.tenant_id = p_tenant_id
            AND a.agent_id = p_agent_id
            AND a.status NOT IN ('cancelled', 'rescheduled')
            AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
            -- Verificar solapamiento de tiempo
            AND (
                (a.scheduled_at, a.scheduled_at + (a.duration_minutes || ' minutes')::interval)
                OVERLAPS
                (p_scheduled_at, v_scheduled_end)
            );
    ELSIF p_type = 'in_person' AND p_location_id IS NOT NULL THEN
        -- Para presenciales, verificar que la sede no tenga otra cita
        -- (Nota: esto podria refinarse si una sede puede tener multiples citas simultaneas)
        SELECT COUNT(*)
        INTO v_conflict_count
        FROM public.appointments a
        WHERE a.tenant_id = p_tenant_id
            AND a.location_id = p_location_id
            AND a.status NOT IN ('cancelled', 'rescheduled')
            AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
            AND (
                (a.scheduled_at, a.scheduled_at + (a.duration_minutes || ' minutes')::interval)
                OVERLAPS
                (p_scheduled_at, v_scheduled_end)
            );
    ELSE
        -- Tipo invalido o parametros faltantes
        RETURN false;
    END IF;

    RETURN v_conflict_count = 0;
END;
$$;

-- ============================================================================
-- PARTE 10: COMENTARIOS DE DOCUMENTACION
-- ============================================================================

COMMENT ON TABLE public.tenant_locations IS 'Sedes/despachos de un tenant para citas presenciales';
COMMENT ON TABLE public.appointments IS 'Citas programadas (llamadas o presenciales)';
COMMENT ON VIEW public.v_appointments_detailed IS 'Vista enriquecida de citas con datos de contacto, agente y sede';
COMMENT ON FUNCTION public.calculate_appointments_stats IS 'Calcula estadisticas de citas para un tenant';
COMMENT ON FUNCTION public.get_contact_upcoming_appointments IS 'Obtiene las proximas citas de un contacto';
COMMENT ON FUNCTION public.check_appointment_availability IS 'Verifica disponibilidad para una cita';

COMMENT ON COLUMN public.appointments.type IS 'Tipo de cita: call (llamada) o in_person (presencial)';
COMMENT ON COLUMN public.appointments.agent_id IS 'Comercial asignado (requerido para tipo call)';
COMMENT ON COLUMN public.appointments.location_id IS 'Sede asignada (requerido para tipo in_person)';
COMMENT ON COLUMN public.appointments.call_id IS 'Referencia a la llamada realizada (se vincula post-llamada)';
