-- =============================================================================
-- Migration: Add Comercial Roles System
-- Description: Adds comercial_role enum, extends profiles with role/location,
--              adds contact assignment fields, extends invitations
-- =============================================================================

-- 1. Enum para roles comerciales
CREATE TYPE public.comercial_role AS ENUM (
  'director_comercial_general',
  'director_sede',
  'comercial'
);

-- 2. Extender profiles con rol comercial, sede e ID externo
ALTER TABLE public.profiles
  ADD COLUMN comercial_role public.comercial_role DEFAULT NULL,
  ADD COLUMN location_id UUID DEFAULT NULL REFERENCES public.tenant_locations(id) ON DELETE SET NULL,
  ADD COLUMN full_name TEXT DEFAULT NULL,
  ADD COLUMN external_id TEXT DEFAULT NULL;

-- 3. Asignacion de contactos a comerciales + sede
ALTER TABLE public.crm_contacts
  ADD COLUMN assigned_to UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN location_id UUID DEFAULT NULL REFERENCES public.tenant_locations(id) ON DELETE SET NULL;

-- 4. Extender invitaciones para incluir rol comercial e ID externo
ALTER TABLE public.user_invitations
  ADD COLUMN comercial_role public.comercial_role DEFAULT NULL,
  ADD COLUMN location_id UUID DEFAULT NULL REFERENCES public.tenant_locations(id) ON DELETE SET NULL,
  ADD COLUMN external_id TEXT DEFAULT NULL;

-- 5. Indices para queries frecuentes
CREATE INDEX idx_profiles_comercial_role ON public.profiles(tenant_id, comercial_role);
CREATE INDEX idx_profiles_location_id ON public.profiles(location_id);
CREATE INDEX idx_crm_contacts_assigned_to ON public.crm_contacts(assigned_to);
CREATE INDEX idx_crm_contacts_location_id ON public.crm_contacts(location_id);
