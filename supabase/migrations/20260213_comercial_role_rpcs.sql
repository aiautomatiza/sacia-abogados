-- =============================================================================
-- Migration: RPC functions for comercial role management
-- Description: SECURITY DEFINER functions that bypass RLS and enforce hierarchy
--
-- Hierarchy (each level can only assign LOWER levels):
--   null (admin/owner)         → director_comercial_general, director_sede, comercial
--   director_comercial_general → director_sede, comercial
--   director_sede              → comercial
--   comercial                  → (cannot manage roles)
-- =============================================================================

-- Helper: returns numeric rank (lower = more power, NULL = admin = 0)
CREATE OR REPLACE FUNCTION public._comercial_role_rank(r public.comercial_role)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN r IS NULL THEN 0
    WHEN r = 'director_comercial_general' THEN 1
    WHEN r = 'director_sede' THEN 2
    WHEN r = 'comercial' THEN 3
    ELSE 99
  END;
$$;

-- ----------------------------------------------------------------
-- update_comercial_role: assign or change a user's comercial role
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_comercial_role(
  target_user_id UUID,
  new_role public.comercial_role,
  new_location_id UUID DEFAULT NULL,
  new_external_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant_id UUID;
  caller_role public.comercial_role;
  target_tenant_id UUID;
BEGIN
  -- Get caller info
  SELECT tenant_id, comercial_role
    INTO caller_tenant_id, caller_role
    FROM public.profiles
   WHERE id = auth.uid();

  -- Get target tenant
  SELECT tenant_id
    INTO target_tenant_id
    FROM public.profiles
   WHERE id = target_user_id;

  -- Same tenant check
  IF caller_tenant_id IS DISTINCT FROM target_tenant_id THEN
    RAISE EXCEPTION 'Access denied: different tenant';
  END IF;

  -- Cannot edit yourself
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot change your own comercial role';
  END IF;

  -- Hierarchy: caller rank must be strictly lower (more powerful) than new_role
  IF public._comercial_role_rank(caller_role) >= public._comercial_role_rank(new_role) THEN
    RAISE EXCEPTION 'Cannot assign a role equal or higher than your own';
  END IF;

  -- Perform update
  UPDATE public.profiles
     SET comercial_role = new_role,
         location_id    = CASE WHEN new_role = 'director_sede' THEN new_location_id ELSE NULL END,
         external_id    = new_external_id,
         updated_at     = NOW()
   WHERE id = target_user_id;
END;
$$;

-- ----------------------------------------------------------------
-- remove_comercial_role: strip a user's comercial role
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_comercial_role(
  target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant_id UUID;
  caller_role public.comercial_role;
  target_tenant_id UUID;
  target_role public.comercial_role;
BEGIN
  -- Get caller info
  SELECT tenant_id, comercial_role
    INTO caller_tenant_id, caller_role
    FROM public.profiles
   WHERE id = auth.uid();

  -- Get target info
  SELECT tenant_id, comercial_role
    INTO target_tenant_id, target_role
    FROM public.profiles
   WHERE id = target_user_id;

  -- Same tenant check
  IF caller_tenant_id IS DISTINCT FROM target_tenant_id THEN
    RAISE EXCEPTION 'Access denied: different tenant';
  END IF;

  -- Cannot edit yourself
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot change your own comercial role';
  END IF;

  -- Caller must outrank the target's current role
  IF target_role IS NOT NULL
     AND public._comercial_role_rank(caller_role) >= public._comercial_role_rank(target_role) THEN
    RAISE EXCEPTION 'Cannot remove role of a user with equal or higher rank';
  END IF;

  UPDATE public.profiles
     SET comercial_role = NULL,
         location_id    = NULL,
         external_id    = NULL,
         updated_at     = NOW()
   WHERE id = target_user_id;
END;
$$;
