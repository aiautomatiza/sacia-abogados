-- ============================================
-- CRITICAL SECURITY FIX: campaign_queue RLS
-- ============================================
-- This table contains sensitive customer data (phone numbers, names, attributes)
-- and must be protected from unauthorized access

-- Ensure RLS is enabled
ALTER TABLE public.campaign_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage queue" ON public.campaign_queue;

-- Create restrictive policy: ONLY service_role can access campaign_queue
-- This prevents ANY authenticated or anonymous users from reading/writing
CREATE POLICY "Service role only can manage queue"
ON public.campaign_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Explicit denial for authenticated users (defense in depth)
CREATE POLICY "Deny all access to authenticated users"
ON public.campaign_queue
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Explicit denial for anonymous users (defense in depth)
CREATE POLICY "Deny all access to anonymous users"
ON public.campaign_queue
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- VERIFY: tenant_credentials RLS
-- ============================================
-- Ensure RLS is enabled on tenant_credentials
ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;

-- The existing policy should already restrict access to super_admin only
-- Adding explicit denial policies for additional security

DROP POLICY IF EXISTS "Deny authenticated non-admins from tenant_credentials" ON public.tenant_credentials;
CREATE POLICY "Deny authenticated non-admins from tenant_credentials"
ON public.tenant_credentials
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Explicit denial for anonymous users
DROP POLICY IF EXISTS "Deny anonymous access to tenant_credentials" ON public.tenant_credentials;
CREATE POLICY "Deny anonymous access to tenant_credentials"
ON public.tenant_credentials
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.campaign_queue IS 
'CRITICAL: Contains sensitive customer PII. Only accessible via service_role for edge functions.';

COMMENT ON TABLE public.tenant_credentials IS 
'CRITICAL: Contains API credentials. Only accessible to super_admin users.';