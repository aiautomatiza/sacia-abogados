-- Migration: Allow NULL changed_by in contact status history
-- Description: Support external API status updates where there's no authenticated user
-- Date: 2026-01-20

-- =====================================================
-- 1. ALTER TABLE: Make changed_by nullable
-- =====================================================
-- External APIs (like external-contact-api) update status without a user context
-- These are system-to-system integrations that don't have an auth.uid()

ALTER TABLE public.crm_contact_status_history
  ALTER COLUMN changed_by DROP NOT NULL;

-- Update the comment to reflect the change
COMMENT ON COLUMN public.crm_contact_status_history.changed_by 
  IS 'User who changed the status. NULL for external/system updates.';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

