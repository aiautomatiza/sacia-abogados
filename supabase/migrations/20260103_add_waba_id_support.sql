-- ============================================
-- Migration: Add WABA ID Support to WhatsApp Infrastructure
-- Date: 2025-01-03
-- Description: Add waba_id to whatsapp_templates and whatsapp_numbers
--              to filter templates by WhatsApp Business Account
-- ============================================

-- ============================================
-- PHASE 1: Create validation function
-- ============================================

-- Create validation function for WABA ID format
CREATE OR REPLACE FUNCTION validate_waba_id(waba_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Meta WABA IDs are typically 15-17 digit numbers
  -- Also accept placeholder format: WABA_PENDING_<8_hex_chars>
  RETURN waba_id ~ '^\d{15,17}$' OR waba_id ~ '^WABA_PENDING_[a-f0-9]{8}$';
END;
$$;

COMMENT ON FUNCTION validate_waba_id IS
  'Validates WABA ID format: 15-17 digits numeric (Meta ID) or WABA_PENDING_<8_hex> placeholder';

-- ============================================
-- PHASE 2: Add waba_id to whatsapp_numbers
-- ============================================

-- 1. Add waba_id column (nullable for migration)
ALTER TABLE public.whatsapp_numbers
  ADD COLUMN IF NOT EXISTS waba_id TEXT;

-- 2. Add CHECK constraint for WABA ID format
ALTER TABLE public.whatsapp_numbers
  ADD CONSTRAINT whatsapp_numbers_waba_id_format
  CHECK (waba_id IS NULL OR validate_waba_id(waba_id));

-- 3. Populate existing records with placeholder values
-- Format: WABA_PENDING_<first 8 chars of tenant_id>
UPDATE public.whatsapp_numbers
SET waba_id = 'WABA_PENDING_' || substring(tenant_id::text, 1, 8)
WHERE waba_id IS NULL;

-- 4. Create index for filtering by WABA
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_waba_id
  ON public.whatsapp_numbers(waba_id)
  WHERE waba_id IS NOT NULL;

-- 5. Create composite index for tenant + WABA filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_tenant_waba
  ON public.whatsapp_numbers(tenant_id, waba_id);

-- 6. Add column comment
COMMENT ON COLUMN public.whatsapp_numbers.waba_id IS
  'WhatsApp Business Account ID from Meta (15-17 digits numeric or WABA_PENDING_xxxxxxxx placeholder). Nullable during migration.';

-- ============================================
-- PHASE 3: Add waba_id to whatsapp_templates
-- ============================================

-- 7. Add waba_id column to templates (nullable for migration)
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS waba_id TEXT;

-- 8. Add CHECK constraint for WABA ID format
ALTER TABLE public.whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_waba_id_format
  CHECK (waba_id IS NULL OR validate_waba_id(waba_id));

-- 9. Populate existing templates with placeholder based on tenant
-- Strategy: Use same placeholder as default whatsapp_number for tenant (if exists)
UPDATE public.whatsapp_templates t
SET waba_id = (
  SELECT wn.waba_id
  FROM public.whatsapp_numbers wn
  WHERE wn.tenant_id = t.tenant_id
    AND wn.is_default = true
  LIMIT 1
)
WHERE t.waba_id IS NULL;

-- 10. Fallback: If no default number, use tenant-based placeholder
UPDATE public.whatsapp_templates
SET waba_id = 'WABA_PENDING_' || substring(tenant_id::text, 1, 8)
WHERE waba_id IS NULL;

-- 11. Create index for filtering templates by WABA
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_waba_id
  ON public.whatsapp_templates(waba_id)
  WHERE waba_id IS NOT NULL;

-- 12. Create composite index for tenant + WABA + status (optimized query)
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_waba_status
  ON public.whatsapp_templates(tenant_id, waba_id, status);

-- 13. Add column comment
COMMENT ON COLUMN public.whatsapp_templates.waba_id IS
  'WhatsApp Business Account ID. Templates are only available to phone numbers in the same WABA. Nullable during migration.';

-- ============================================
-- PHASE 4: Helper function for filtering templates
-- ============================================

-- Create function to get templates by WABA
CREATE OR REPLACE FUNCTION get_templates_for_waba(
  p_tenant_id UUID,
  p_waba_id TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  template_id TEXT,
  category TEXT,
  language TEXT,
  status TEXT,
  header_text TEXT,
  body_text TEXT,
  footer_text TEXT,
  variables JSONB,
  waba_id TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.template_id,
    t.category,
    t.language,
    t.status,
    t.header_text,
    t.body_text,
    t.footer_text,
    t.variables,
    t.waba_id
  FROM public.whatsapp_templates t
  WHERE t.tenant_id = p_tenant_id
    AND t.waba_id = p_waba_id
    AND t.status = 'APPROVED'
  ORDER BY t.name;
END;
$$;

COMMENT ON FUNCTION get_templates_for_waba IS
  'Get approved templates for a specific WABA and tenant. Used for filtering templates by phone number.';

-- ============================================
-- PHASE 5: Data integrity triggers
-- ============================================

-- Create trigger to warn when WABA IDs don't match (for multi-WABA tenants)
CREATE OR REPLACE FUNCTION check_waba_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_count INT;
BEGIN
  -- Only check on INSERT/UPDATE of waba_id
  IF (TG_OP = 'UPDATE' AND NEW.waba_id = OLD.waba_id) THEN
    RETURN NEW;
  END IF;

  -- Check if there are templates for a different WABA in this tenant
  SELECT COUNT(*) INTO v_template_count
  FROM public.whatsapp_templates
  WHERE tenant_id = NEW.tenant_id
    AND waba_id IS NOT NULL
    AND waba_id != COALESCE(NEW.waba_id, '')
    AND NOT waba_id LIKE 'WABA_PENDING_%';

  -- Log warning if inconsistency detected (won't block, just warn)
  IF v_template_count > 0 THEN
    RAISE WARNING 'Tenant % has templates for different WABAs. Review WABA configuration.', NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_waba_consistency_trigger ON public.whatsapp_numbers;
CREATE TRIGGER check_waba_consistency_trigger
  BEFORE INSERT OR UPDATE OF waba_id ON public.whatsapp_numbers
  FOR EACH ROW
  EXECUTE FUNCTION check_waba_consistency();

COMMENT ON FUNCTION check_waba_consistency IS
  'Warns when a tenant has phone numbers with different non-placeholder WABA IDs than their templates';

-- ============================================
-- VALIDATION QUERIES (run manually after migration)
-- ============================================

-- Count numbers with pending WABA IDs (need admin configuration)
-- SELECT tenant_id, COUNT(*) as pending_count
-- FROM public.whatsapp_numbers
-- WHERE waba_id LIKE 'WABA_PENDING_%'
-- GROUP BY tenant_id;

-- Count templates with pending WABA IDs
-- SELECT tenant_id, COUNT(*) as pending_count
-- FROM public.whatsapp_templates
-- WHERE waba_id LIKE 'WABA_PENDING_%'
-- GROUP BY tenant_id;

-- Verify WABA consistency per tenant
-- SELECT
--   t.id as tenant_id,
--   t.name as tenant_name,
--   COUNT(DISTINCT wn.waba_id) as distinct_wabas_in_numbers,
--   COUNT(DISTINCT wt.waba_id) as distinct_wabas_in_templates
-- FROM public.tenants t
-- LEFT JOIN public.whatsapp_numbers wn ON wn.tenant_id = t.id
-- LEFT JOIN public.whatsapp_templates wt ON wt.tenant_id = t.id
-- GROUP BY t.id, t.name
-- HAVING COUNT(DISTINCT wn.waba_id) > 1 OR COUNT(DISTINCT wt.waba_id) > 1;

-- Verify all numbers have WABA IDs
-- SELECT COUNT(*) as numbers_without_waba FROM public.whatsapp_numbers WHERE waba_id IS NULL;
-- Expected: 0

-- Verify all templates have WABA IDs
-- SELECT COUNT(*) as templates_without_waba FROM public.whatsapp_templates WHERE waba_id IS NULL;
-- Expected: 0

-- ============================================
-- Migration Complete
-- ============================================
