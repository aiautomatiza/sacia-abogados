-- Make tenant_id nullable in profiles table
-- This is required because super_admins don't have a tenant assigned
ALTER TABLE public.profiles 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Remove the default value for tenant_id (it should be explicitly set)
ALTER TABLE public.profiles 
ALTER COLUMN tenant_id DROP DEFAULT;