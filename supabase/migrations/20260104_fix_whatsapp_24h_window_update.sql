-- ============================================
-- Fix WhatsApp 24h Window Update on Contact Messages
-- ============================================
--
-- PROBLEMA: La ventana de 24 horas de WhatsApp no se actualiza cuando
-- un contacto envía un mensaje.
--
-- SOLUCIÓN: Actualizar la función update_conversation_last_message()
-- para que extienda la ventana de 24 horas (+24h desde NOW) cuando:
-- 1. El mensaje proviene del contacto (sender_type = 'contact')
-- 2. El canal es WhatsApp (channel = 'whatsapp')
--
-- IMPACTO: Cada mensaje del contacto resetea la ventana de 24h,
-- permitiendo al negocio responder libremente durante ese período.
-- ============================================

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.content_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.content_type = 'audio' THEN '🎤 Audio'
      WHEN NEW.content_type = 'image' THEN '🖼️ Imagen'
      WHEN NEW.content_type = 'document' THEN '📄 Documento'
      WHEN NEW.content_type = 'video' THEN '🎥 Video'
      WHEN NEW.content_type = 'location' THEN '📍 Ubicación'
      WHEN NEW.content_type = 'sticker' THEN '😀 Sticker'
      ELSE '📎 Archivo'
    END,
    -- Incrementar unread_count solo si el mensaje es del contacto
    unread_count = CASE
      WHEN NEW.sender_type = 'contact' THEN unread_count + 1
      ELSE unread_count
    END,
    -- Marcar como pendiente de respuesta si es del contacto
    pending_agent_response = CASE
      WHEN NEW.sender_type = 'contact' THEN true
      ELSE false
    END,
    -- NUEVO: Actualizar ventana de 24h de WhatsApp si el mensaje es del contacto
    whatsapp_24h_window_expires_at = CASE
      WHEN NEW.sender_type = 'contact' AND channel = 'whatsapp'
      THEN NOW() + INTERVAL '24 hours'
      ELSE whatsapp_24h_window_expires_at
    END,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_conversation_last_message() IS
'Actualiza automáticamente last_message_at, preview, unread_count, pending_agent_response y whatsapp_24h_window_expires_at (solo WhatsApp) al recibir mensaje';
