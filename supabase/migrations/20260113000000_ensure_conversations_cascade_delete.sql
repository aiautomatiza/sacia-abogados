-- Migración: Asegurar borrado en cascada de conversaciones al eliminar contactos
-- Fecha: 2026-01-13
-- Descripción: Implementa un trigger para borrar conversaciones y sus mensajes cuando se elimina un contacto,
--              evitando conflictos con las políticas RLS

-- Función para borrar conversaciones y mensajes asociados a un contacto
CREATE OR REPLACE FUNCTION public.delete_contact_conversations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Borrar todos los mensajes de las conversaciones del contacto
  -- (se ejecuta primero por la foreign key constraint)
  DELETE FROM public.conversation_messages
  WHERE conversation_id IN (
    SELECT id FROM public.conversations
    WHERE contact_id = OLD.id
  );

  -- Borrar todas las conversaciones del contacto
  DELETE FROM public.conversations
  WHERE contact_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Crear trigger BEFORE DELETE en crm_contacts
DROP TRIGGER IF EXISTS delete_contact_conversations_trigger ON public.crm_contacts;
CREATE TRIGGER delete_contact_conversations_trigger
  BEFORE DELETE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_contact_conversations();

COMMENT ON FUNCTION public.delete_contact_conversations() IS
'Borra automáticamente todas las conversaciones y mensajes asociados cuando se elimina un contacto, usando SECURITY DEFINER para evitar conflictos con RLS';
