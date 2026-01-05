-- ============================================
-- 2.1 ENUMs (Tipos Enumerados)
-- ============================================

-- Canal de comunicación
CREATE TYPE conversation_channel AS ENUM (
  'whatsapp',
  'instagram',
  'webchat',
  'email'
);

-- Estado de la conversación
CREATE TYPE conversation_status AS ENUM (
  'active',    -- Conversación activa
  'archived'   -- Archivada
);

-- Tipo de remitente del mensaje
CREATE TYPE message_sender_type AS ENUM (
  'contact',   -- Mensaje del contacto
  'agent',     -- Mensaje del agente
  'system',    -- Mensaje del sistema (automático)
  'ai'         -- Mensaje de IA
);

-- Tipo de contenido del mensaje
CREATE TYPE message_content_type AS ENUM (
  'text',
  'audio',
  'image',
  'document',
  'video',
  'location',
  'sticker'
);

-- Estado de entrega del mensaje
CREATE TYPE message_delivery_status AS ENUM (
  'sending',   -- Enviando
  'sent',      -- Enviado al servidor
  'delivered', -- Entregado al dispositivo
  'read',      -- Leído por el destinatario
  'failed'     -- Fallo en el envío
);

-- ============================================
-- 2.2 Tabla: conversations
-- ============================================

CREATE TABLE public.conversations (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,

  -- Configuración de la conversación
  channel conversation_channel NOT NULL DEFAULT 'whatsapp',
  status conversation_status NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Información del último mensaje
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,

  -- Organización y metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Array simple de nombres de tags
  whatsapp_24h_window_expires_at TIMESTAMPTZ,
  state TEXT,  -- 'ia', 'equipo', NULL (indica quién gestiona la conversación)
  pending_agent_response BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT conversations_unread_count_positive CHECK (unread_count >= 0),
  CONSTRAINT conversations_unique_contact_channel UNIQUE (contact_id, channel)
);

-- Índices para optimizar consultas
CREATE INDEX idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_channel ON public.conversations(channel);
CREATE INDEX idx_conversations_state ON public.conversations(state);
CREATE INDEX idx_conversations_tenant_status ON public.conversations(tenant_id, status);

-- Comentarios
COMMENT ON TABLE public.conversations IS 'Conversaciones multicanal aisladas por tenant';
COMMENT ON COLUMN public.conversations.tenant_id IS 'Tenant propietario de la conversación';
COMMENT ON COLUMN public.conversations.whatsapp_24h_window_expires_at IS 'Timestamp de expiración de la ventana de 24 horas de WhatsApp';
COMMENT ON COLUMN public.conversations.state IS 'Estado de gestión: "ia" (IA), "equipo" (agente humano), NULL (sin asignar)';
COMMENT ON COLUMN public.conversations.pending_agent_response IS 'Indica si está pendiente de respuesta del agente';

-- ============================================
-- 2.3 Tabla: conversation_messages
-- ============================================

CREATE TABLE public.conversation_messages (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Información del remitente
  sender_type message_sender_type NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Contenido del mensaje
  content TEXT,
  content_type message_content_type NOT NULL DEFAULT 'text',

  -- Archivos adjuntos
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,  -- MIME type

  -- Estado de entrega
  delivery_status message_delivery_status NOT NULL DEFAULT 'sending',
  error_message TEXT,
  external_message_id TEXT,  -- ID del mensaje en WhatsApp/Instagram

  -- Respuestas y metadata
  replied_to_message_id UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT messages_file_size_positive CHECK (file_size IS NULL OR file_size > 0)
);

-- Índices
CREATE INDEX idx_messages_conversation ON public.conversation_messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_delivery_status ON public.conversation_messages(delivery_status);
CREATE INDEX idx_messages_external_id ON public.conversation_messages(external_message_id);
CREATE INDEX idx_messages_sender ON public.conversation_messages(sender_type, sender_id);
CREATE INDEX idx_messages_created_at ON public.conversation_messages(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.conversation_messages IS 'Mensajes de conversaciones con soporte multicanal';
COMMENT ON COLUMN public.conversation_messages.external_message_id IS 'ID del mensaje en la plataforma externa (WhatsApp, Instagram)';
COMMENT ON COLUMN public.conversation_messages.replied_to_message_id IS 'Referencia al mensaje al que se responde';

-- ============================================
-- 2.4 Tabla: conversation_tags
-- ============================================

CREATE TABLE public.conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint único por tenant
  CONSTRAINT conversation_tags_unique_name UNIQUE (tenant_id, name)
);

-- Índices
CREATE INDEX idx_tags_tenant ON public.conversation_tags(tenant_id);
CREATE INDEX idx_tags_name ON public.conversation_tags(name);

-- Comentarios
COMMENT ON TABLE public.conversation_tags IS 'Tags para organizar conversaciones, aislados por tenant';
COMMENT ON COLUMN public.conversation_tags.is_system IS 'Indica si es un tag del sistema (no se puede eliminar)';

-- ============================================
-- 2.5 Tabla: whatsapp_templates
-- ============================================

CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Identificación del template
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,  -- ID en WhatsApp Business API
  category TEXT NOT NULL,  -- MARKETING, UTILITY, AUTHENTICATION
  language TEXT NOT NULL DEFAULT 'es',
  status TEXT NOT NULL DEFAULT 'PENDING',  -- APPROVED, PENDING, REJECTED

  -- Contenido del template
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,  -- [{name, position}]

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_whatsapp_templates_tenant ON public.whatsapp_templates(tenant_id);
CREATE INDEX idx_whatsapp_templates_status ON public.whatsapp_templates(status);

-- Comentarios
COMMENT ON TABLE public.whatsapp_templates IS 'Templates de WhatsApp Business API por tenant';