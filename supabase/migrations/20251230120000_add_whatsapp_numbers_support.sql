-- ============================================
-- Migration: Add Multi-Number WhatsApp Support
-- Date: 2025-12-30
-- Description: Adds whatsapp_numbers table for managing multiple WhatsApp numbers per tenant
-- ============================================

-- ============================================
-- 1. Create whatsapp_numbers table
-- ============================================

CREATE TABLE public.whatsapp_numbers (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Phone number configuration
  phone_number TEXT NOT NULL,  -- E.164 format: +1234567890
  alias TEXT NOT NULL,  -- User-friendly name: "Soporte", "Ventas", "Principal"
  is_default BOOLEAN DEFAULT false,  -- One default per tenant

  -- Credentials and webhook (independent per number)
  whatsapp_credential TEXT,  -- API key/token for this number
  webhook_url TEXT,  -- Webhook URL for this number

  -- Status and metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata JSONB DEFAULT '{}'::jsonb,  -- For future extensibility

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT whatsapp_numbers_unique_phone UNIQUE (tenant_id, phone_number),
  CONSTRAINT whatsapp_numbers_unique_alias UNIQUE (tenant_id, alias),
  CONSTRAINT whatsapp_numbers_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- ============================================
-- 2. Create indexes
-- ============================================

CREATE INDEX idx_whatsapp_numbers_tenant ON public.whatsapp_numbers(tenant_id);
CREATE INDEX idx_whatsapp_numbers_status ON public.whatsapp_numbers(status);
CREATE INDEX idx_whatsapp_numbers_default ON public.whatsapp_numbers(tenant_id, is_default)
  WHERE is_default = true;

-- ============================================
-- 3. Add comments
-- ============================================

COMMENT ON TABLE public.whatsapp_numbers IS
  'WhatsApp phone numbers per tenant with independent credentials and webhooks';
COMMENT ON COLUMN public.whatsapp_numbers.alias IS
  'User-friendly name displayed in UI (e.g., "Soporte", "Ventas")';
COMMENT ON COLUMN public.whatsapp_numbers.is_default IS
  'Default number for new conversations. Only one per tenant.';
COMMENT ON COLUMN public.whatsapp_numbers.phone_number IS
  'Phone number in E.164 format (+1234567890)';

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins have full access
DROP POLICY IF EXISTS "whatsapp_numbers_super_admin_all" ON public.whatsapp_numbers;
CREATE POLICY "whatsapp_numbers_super_admin_all"
  ON public.whatsapp_numbers
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policy: Regular users access only their tenant's numbers
DROP POLICY IF EXISTS "whatsapp_numbers_tenant_access" ON public.whatsapp_numbers;
CREATE POLICY "whatsapp_numbers_tenant_access"
  ON public.whatsapp_numbers
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================
-- 5. Create triggers
-- ============================================

-- Trigger: Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS whatsapp_numbers_updated_at ON public.whatsapp_numbers;
CREATE TRIGGER whatsapp_numbers_updated_at
  BEFORE UPDATE ON public.whatsapp_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Ensure only one default per tenant
CREATE OR REPLACE FUNCTION public.ensure_single_default_whatsapp_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other defaults for this tenant
    UPDATE public.whatsapp_numbers
    SET is_default = false, updated_at = now()
    WHERE tenant_id = NEW.tenant_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_default_whatsapp ON public.whatsapp_numbers;
CREATE TRIGGER ensure_single_default_whatsapp
  BEFORE INSERT OR UPDATE ON public.whatsapp_numbers
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_whatsapp_number();

-- ============================================
-- 6. Enable Realtime
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_numbers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.whatsapp_numbers REPLICA IDENTITY FULL;

-- ============================================
-- 7. Add whatsapp_number_id to conversations table
-- ============================================

-- Add column to track which WhatsApp number was used
ALTER TABLE public.conversations
  ADD COLUMN whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL;

-- Add index for filtering by WhatsApp number
CREATE INDEX idx_conversations_whatsapp_number ON public.conversations(whatsapp_number_id)
  WHERE channel = 'whatsapp';

-- Add composite index for tenant + WhatsApp number filtering
CREATE INDEX idx_conversations_tenant_whatsapp ON public.conversations(tenant_id, whatsapp_number_id)
  WHERE channel = 'whatsapp';

-- Add comment
COMMENT ON COLUMN public.conversations.whatsapp_number_id IS
  'WhatsApp number used for this conversation. NULL for non-WhatsApp channels or legacy conversations.';

-- ============================================
-- 8. Data Migration: Create default WhatsApp numbers
-- ============================================

-- Create a default "Principal" WhatsApp number for tenants with WhatsApp enabled
-- This ensures backward compatibility with existing conversations
-- NOTE: Cleans phone number (removes spaces/dashes) and validates E.164 format
INSERT INTO public.whatsapp_numbers (
  tenant_id,
  phone_number,
  alias,
  is_default,
  status,
  whatsapp_credential,
  webhook_url
)
SELECT
  ts.tenant_id,
  -- Clean phone number: remove spaces, dashes, parentheses
  regexp_replace(ts.calls_phone_number, '[\s\-\(\)]', '', 'g') as phone_number,
  'Principal' as alias,
  true as is_default,
  'active' as status,
  tc.whatsapp_credential,
  ts.whatsapp_webhook_url
FROM public.tenant_settings ts
LEFT JOIN public.tenant_credentials tc ON tc.tenant_id = ts.tenant_id
WHERE ts.whatsapp_enabled = true
  AND ts.calls_phone_number IS NOT NULL
  -- Validate E.164 format after cleaning
  AND regexp_replace(ts.calls_phone_number, '[\s\-\(\)]', '', 'g') ~ '^\+[1-9]\d{1,14}$'
ON CONFLICT (tenant_id, phone_number) DO NOTHING;

-- For tenants without a valid phone number, they will need to configure manually via admin panel

-- ============================================
-- 9. Optional: Link existing WhatsApp conversations to default number
-- ============================================

-- This is optional and can be run later if needed
-- Uncomment to automatically assign all existing WhatsApp conversations to the default number

/*
UPDATE public.conversations c
SET whatsapp_number_id = (
  SELECT wn.id
  FROM public.whatsapp_numbers wn
  WHERE wn.tenant_id = c.tenant_id
    AND wn.is_default = true
  LIMIT 1
)
WHERE c.channel = 'whatsapp'
  AND c.whatsapp_number_id IS NULL;
*/

-- ============================================
-- Migration Complete
-- ============================================
