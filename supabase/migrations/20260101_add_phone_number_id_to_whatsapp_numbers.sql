-- Migration: Add phone_number_id from Meta as primary FK
-- This migration changes conversations.whatsapp_number_id from UUID to TEXT
-- to reference whatsapp_numbers.phone_number_id instead of whatsapp_numbers.id

-- ============================================================================
-- PHASE 1: Add phone_number_id column to whatsapp_numbers
-- ============================================================================

-- 1. Add phone_number_id column (temporarily nullable for migration)
ALTER TABLE public.whatsapp_numbers
  ADD COLUMN IF NOT EXISTS phone_number_id TEXT;

-- 2. Populate existing records with placeholder values
-- Format: PENDING_<first 8 chars of UUID>
-- This allows admins to identify and update with real Meta IDs later
UPDATE public.whatsapp_numbers
SET phone_number_id = 'PENDING_' || substring(id::text, 1, 8)
WHERE phone_number_id IS NULL;

-- 3. Make phone_number_id NOT NULL
ALTER TABLE public.whatsapp_numbers
  ALTER COLUMN phone_number_id SET NOT NULL;

-- 4. Add UNIQUE constraint on phone_number_id
ALTER TABLE public.whatsapp_numbers
  ADD CONSTRAINT whatsapp_numbers_phone_number_id_unique UNIQUE (phone_number_id);

-- 5. Create index for performance (UNIQUE constraint already creates one, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_phone_number_id
  ON public.whatsapp_numbers(phone_number_id);

-- 6. Add column comment
COMMENT ON COLUMN public.whatsapp_numbers.phone_number_id IS
  'Meta/WhatsApp Business API Phone Number ID (15-16 digits numeric or PENDING_xxxxxxxx placeholder). Required and unique.';

-- ============================================================================
-- PHASE 2: Migrate conversations.whatsapp_number_id from UUID to TEXT
-- ============================================================================

-- 7. Create temporary table for UUID → phone_number_id mapping
CREATE TEMP TABLE uuid_to_phone_map AS
SELECT id::text as uuid_id, phone_number_id
FROM public.whatsapp_numbers;

-- 8. Add new temporary column in conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS whatsapp_number_id_new TEXT;

-- 9. Migrate data: map UUID values to phone_number_id values
UPDATE public.conversations c
SET whatsapp_number_id_new = m.phone_number_id
FROM uuid_to_phone_map m
WHERE c.whatsapp_number_id IS NOT NULL
  AND c.whatsapp_number_id::text = m.uuid_id;

-- 10. Drop old foreign key constraint
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_whatsapp_number_id_fkey;

-- 11. Drop old UUID column
ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS whatsapp_number_id;

-- 12. Rename new column to whatsapp_number_id
ALTER TABLE public.conversations
  RENAME COLUMN whatsapp_number_id_new TO whatsapp_number_id;

-- ============================================================================
-- PHASE 3: Create new FK and indexes
-- ============================================================================

-- 13. Create new foreign key referencing phone_number_id
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_whatsapp_number_id_fkey
  FOREIGN KEY (whatsapp_number_id)
  REFERENCES public.whatsapp_numbers(phone_number_id)
  ON DELETE SET NULL;

-- 14. Drop old indexes
DROP INDEX IF EXISTS public.idx_conversations_whatsapp_number;
DROP INDEX IF EXISTS public.idx_conversations_tenant_whatsapp;

-- 15. Recreate indexes with new TEXT column
CREATE INDEX idx_conversations_whatsapp_number
  ON public.conversations(whatsapp_number_id)
  WHERE channel = 'whatsapp';

CREATE INDEX idx_conversations_tenant_whatsapp
  ON public.conversations(tenant_id, whatsapp_number_id)
  WHERE channel = 'whatsapp';

-- 16. Update column comment for conversations
COMMENT ON COLUMN public.conversations.whatsapp_number_id IS
  'Reference to Meta Phone Number ID from whatsapp_numbers table (TEXT, not UUID)';

-- ============================================================================
-- VALIDATION QUERIES (run these manually after migration)
-- ============================================================================

-- Verify all whatsapp_numbers have phone_number_id
-- Expected: 0
-- SELECT COUNT(*) as missing_phone_number_id FROM public.whatsapp_numbers WHERE phone_number_id IS NULL;

-- Verify conversations migration success
-- SELECT COUNT(*) as conversations_with_number
-- FROM public.conversations
-- WHERE channel = 'whatsapp' AND whatsapp_number_id IS NOT NULL;

-- List numbers with placeholder (need admin configuration)
-- SELECT id, alias, phone_number, phone_number_id, created_at
-- FROM public.whatsapp_numbers
-- WHERE phone_number_id LIKE 'PENDING_%'
-- ORDER BY created_at DESC;

-- Verify FK is working (should return related conversations)
-- SELECT c.id, c.channel, w.alias, w.phone_number_id
-- FROM public.conversations c
-- JOIN public.whatsapp_numbers w ON c.whatsapp_number_id = w.phone_number_id
-- WHERE c.channel = 'whatsapp'
-- LIMIT 5;
