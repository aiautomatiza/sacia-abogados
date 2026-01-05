-- Migration: Update conversations unique constraint to allow multiple WhatsApp conversations per contact
-- This allows a contact to have separate conversations for different WhatsApp numbers

-- ============================================================================
-- Remove old constraint and create new one
-- ============================================================================

-- 1. Drop the old constraint that only considers (contact_id, channel)
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_unique_contact_channel;

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_contact_id_channel_key;

-- 2. Create new constraint that includes whatsapp_number_id
-- This allows multiple WhatsApp conversations per contact (one per number)
-- but maintains uniqueness for each contact + channel + whatsapp_number combination
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_unique_per_number
  UNIQUE NULLS NOT DISTINCT (contact_id, channel, whatsapp_number_id);

-- Note: NULLS NOT DISTINCT ensures that (contact_id, channel, NULL) is unique
-- This is important for non-WhatsApp channels or WhatsApp conversations without assigned number

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON CONSTRAINT conversations_unique_per_number ON public.conversations IS
  'Ensures uniqueness of conversations per contact, channel, and WhatsApp number. '
  'Allows multiple WhatsApp conversations for same contact if using different numbers. '
  'Uses NULLS NOT DISTINCT to treat NULL whatsapp_number_id as a distinct value.';

-- ============================================================================
-- Validation queries (run these manually after migration)
-- ============================================================================

-- Verify constraint exists
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'conversations'::regclass
--   AND conname = 'conversations_unique_per_number';

-- Test: List contacts with multiple WhatsApp conversations (should be possible now)
-- SELECT
--   c.numero,
--   c.nombre,
--   COUNT(conv.id) as conversation_count,
--   STRING_AGG(DISTINCT w.alias, ', ') as whatsapp_numbers
-- FROM crm_contacts c
-- JOIN conversations conv ON conv.contact_id = c.id
-- LEFT JOIN whatsapp_numbers w ON w.phone_number_id = conv.whatsapp_number_id
-- WHERE conv.channel = 'whatsapp'
-- GROUP BY c.id, c.numero, c.nombre
-- HAVING COUNT(conv.id) > 1;
