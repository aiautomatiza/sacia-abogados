-- Add conversations webhook configuration to tenant_settings and tenant_credentials
-- Migration: Add conversations channel configuration support

-- Add conversations fields to tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN conversations_enabled BOOLEAN DEFAULT false,
  ADD COLUMN conversations_webhook_url TEXT;

-- Add conversations credential field to tenant_credentials
ALTER TABLE public.tenant_credentials
  ADD COLUMN conversations_credential TEXT;

-- Add column documentation
COMMENT ON COLUMN public.tenant_settings.conversations_enabled IS
  'Habilita el canal de conversaciones multi-canal (WhatsApp, Instagram, webchat, email, voice)';

COMMENT ON COLUMN public.tenant_settings.conversations_webhook_url IS
  'Webhook URL para mensajes de conversaciones. Debe ser HTTPS. Obligatorio si conversations_enabled=true';

COMMENT ON COLUMN public.tenant_credentials.conversations_credential IS
  'API Key/Token para autenticación con el webhook de conversaciones';
