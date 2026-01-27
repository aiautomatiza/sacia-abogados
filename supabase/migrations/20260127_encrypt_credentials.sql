-- Migration: Add encryption tracking for tenant credentials
-- This migration adds a column to track encryption status
-- Actual encryption of existing credentials is done via Edge Function

-- Add encryption_version column to track encryption status
-- 0 = plaintext (legacy, needs migration)
-- 1 = AES-256-GCM encrypted
ALTER TABLE public.tenant_credentials
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.tenant_credentials.encryption_version IS
  'Tracks encryption version: 0=plaintext (legacy), 1=AES-256-GCM encrypted';

-- Create index for finding unencrypted credentials during migration
CREATE INDEX IF NOT EXISTS idx_tenant_credentials_encryption_version
  ON public.tenant_credentials(encryption_version)
  WHERE encryption_version = 0;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration: Added encryption_version column to tenant_credentials';
  RAISE NOTICE 'Run the migrate-credentials Edge Function to encrypt existing credentials';
END $$;
