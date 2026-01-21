-- Migration: Fix Contact Statuses RLS Policies
-- Description: Update RLS policies to use profile lookup instead of JWT claims
-- Date: 2026-01-20
-- Issue: JWT tokens don't contain tenant_id claim, causing INSERT failures

-- =====================================================
-- 1. CREATE HELPER FUNCTION: get_user_tenant_id
-- =====================================================
-- This function looks up the tenant_id from the user's profile
-- More reliable than expecting tenant_id in JWT claims

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_tenant_id() IS 'Returns the tenant_id for the currently authenticated user';

-- =====================================================
-- 2. DROP EXISTING RLS POLICIES: crm_contact_statuses
-- =====================================================
DROP POLICY IF EXISTS "Users can view statuses from their tenant" ON public.crm_contact_statuses;
DROP POLICY IF EXISTS "Users can insert statuses in their tenant" ON public.crm_contact_statuses;
DROP POLICY IF EXISTS "Users can update statuses in their tenant" ON public.crm_contact_statuses;
DROP POLICY IF EXISTS "Users can delete statuses in their tenant" ON public.crm_contact_statuses;

-- =====================================================
-- 3. CREATE NEW RLS POLICIES: crm_contact_statuses
-- =====================================================
-- Using the helper function instead of JWT claims

CREATE POLICY "Users can view statuses from their tenant"
  ON public.crm_contact_statuses FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert statuses in their tenant"
  ON public.crm_contact_statuses FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update statuses in their tenant"
  ON public.crm_contact_statuses FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete statuses in their tenant"
  ON public.crm_contact_statuses FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- =====================================================
-- 4. DROP EXISTING RLS POLICIES: crm_contact_status_history
-- =====================================================
DROP POLICY IF EXISTS "Users can view history from their tenant" ON public.crm_contact_status_history;
DROP POLICY IF EXISTS "System can insert history" ON public.crm_contact_status_history;

-- =====================================================
-- 5. CREATE NEW RLS POLICIES: crm_contact_status_history
-- =====================================================

CREATE POLICY "Users can view history from their tenant"
  ON public.crm_contact_status_history FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert history in their tenant"
  ON public.crm_contact_status_history FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- =====================================================
-- END OF MIGRATION
-- =====================================================
