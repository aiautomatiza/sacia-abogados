
-- Fase 1: Base de datos para módulo de llamadas

-- 1. Crear enums
CREATE TYPE public.call_state AS ENUM (
  'pending',
  'completed', 
  'failed',
  'missed',
  'voicemail',
  'user_hangup',
  'scheduled'
);

CREATE TYPE public.call_type AS ENUM (
  'inbound',
  'outbound'
);

-- 2. Crear tabla crm_calls
CREATE TABLE public.crm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Identificador externo (Twilio, Vapi, etc.)
  call_sid TEXT UNIQUE,
  
  -- Datos de la llamada
  call_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type call_type NOT NULL DEFAULT 'outbound',
  state call_state NOT NULL DEFAULT 'pending',
  end_reason TEXT,
  
  -- Duración
  duration_seconds INTEGER,
  
  -- Contenido
  summary TEXT,
  transcript TEXT,
  
  -- Audio
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  
  -- Metadata flexible
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX idx_crm_calls_tenant_id ON public.crm_calls(tenant_id);
CREATE INDEX idx_crm_calls_contact_id ON public.crm_calls(contact_id);
CREATE INDEX idx_crm_calls_agent_id ON public.crm_calls(agent_id);
CREATE INDEX idx_crm_calls_call_datetime ON public.crm_calls(call_datetime DESC);
CREATE INDEX idx_crm_calls_state ON public.crm_calls(state);
CREATE INDEX idx_crm_calls_type ON public.crm_calls(type);
CREATE INDEX idx_crm_calls_call_sid ON public.crm_calls(call_sid) WHERE call_sid IS NOT NULL;

-- 4. Trigger para updated_at
CREATE TRIGGER update_crm_calls_updated_at
  BEFORE UPDATE ON public.crm_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Habilitar RLS
ALTER TABLE public.crm_calls ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "calls_tenant_access"
  ON public.crm_calls
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "calls_super_admin_all"
  ON public.crm_calls
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 7. Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_calls;

-- 8. Agregar enums a Constants (comentario para referencia)
-- Los nuevos enums call_state y call_type estarán disponibles en types.ts después de regenerar
