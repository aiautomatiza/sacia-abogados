-- ============================================
-- 2.6 ROW LEVEL SECURITY (RLS)
-- ============================================

-- Funciones Helper
-- ----------------

-- Obtener tenant_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = p_user_id
  LIMIT 1;

  RETURN v_tenant_id;
END;
$$;

-- Verificar si usuario es super_admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$;

COMMENT ON FUNCTION get_user_tenant_id(UUID) IS 'Obtiene el tenant_id del usuario desde profiles';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Verifica si el usuario tiene rol super_admin';

-- RLS Policies para conversations
-- --------------------------------

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Super admins: acceso total
DROP POLICY IF EXISTS "conversations_super_admin_all" ON public.conversations;
CREATE POLICY "conversations_super_admin_all"
  ON public.conversations
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Users: acceso solo a su tenant
DROP POLICY IF EXISTS "conversations_tenant_access" ON public.conversations;
CREATE POLICY "conversations_tenant_access"
  ON public.conversations
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS Policies para conversation_messages
-- ----------------------------------------

-- Enable RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Super admins: acceso total
DROP POLICY IF EXISTS "messages_super_admin_all" ON public.conversation_messages;
CREATE POLICY "messages_super_admin_all"
  ON public.conversation_messages
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Users: heredan permisos de conversation
DROP POLICY IF EXISTS "messages_tenant_access" ON public.conversation_messages;
CREATE POLICY "messages_tenant_access"
  ON public.conversation_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.tenant_id = get_user_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- RLS Policies para conversation_tags
-- ------------------------------------

-- Enable RLS
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

-- Super admins: acceso total
DROP POLICY IF EXISTS "tags_super_admin_all" ON public.conversation_tags;
CREATE POLICY "tags_super_admin_all"
  ON public.conversation_tags
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Users: acceso solo a tags de su tenant
DROP POLICY IF EXISTS "tags_tenant_access" ON public.conversation_tags;
CREATE POLICY "tags_tenant_access"
  ON public.conversation_tags
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Users: no pueden eliminar tags del sistema
DROP POLICY IF EXISTS "tags_prevent_system_delete" ON public.conversation_tags;
CREATE POLICY "tags_prevent_system_delete"
  ON public.conversation_tags
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    is_system = false
  );

-- RLS Policies para whatsapp_templates
-- -------------------------------------

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Super admins: acceso total
DROP POLICY IF EXISTS "templates_super_admin_all" ON public.whatsapp_templates;
CREATE POLICY "templates_super_admin_all"
  ON public.whatsapp_templates
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Users: acceso solo a templates de su tenant
DROP POLICY IF EXISTS "templates_tenant_access" ON public.whatsapp_templates;
CREATE POLICY "templates_tenant_access"
  ON public.whatsapp_templates
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================
-- 2.7 TRIGGERS Y FUNCIONES
-- ============================================

-- La función handle_updated_at() ya existe en el proyecto
-- Solo necesitamos aplicar los triggers

-- Aplicar a tablas de conversaciones
DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS messages_updated_at ON public.conversation_messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tags_updated_at ON public.conversation_tags;
CREATE TRIGGER tags_updated_at
  BEFORE UPDATE ON public.conversation_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Actualizar conversation al recibir mensaje
-- ----------------------------------------------------

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
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.conversation_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

COMMENT ON FUNCTION public.update_conversation_last_message() IS
'Actualiza automáticamente last_message_at, preview, unread_count y pending_agent_response al recibir mensaje';

-- ============================================
-- 2.8 REALTIME (Supabase)
-- ============================================

-- Agregar tablas a la publicación de Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Configurar REPLICA IDENTITY para Realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_messages REPLICA IDENTITY FULL;

COMMENT ON TABLE public.conversations IS 'Conversaciones multicanal con Realtime habilitado para actualizaciones en tiempo real';
COMMENT ON TABLE public.conversation_messages IS 'Mensajes de conversaciones con Realtime habilitado para mensajes en tiempo real';