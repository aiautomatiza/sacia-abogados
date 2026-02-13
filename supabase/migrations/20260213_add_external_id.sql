-- =============================================================================
-- Migration: Add external_id to profiles and user_invitations
-- Description: Stores the comercial's ID from external management software
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS external_id TEXT DEFAULT NULL;

ALTER TABLE public.user_invitations
  ADD COLUMN IF NOT EXISTS external_id TEXT DEFAULT NULL;
