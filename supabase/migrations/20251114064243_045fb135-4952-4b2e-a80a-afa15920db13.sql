-- Habilitar extensión pgcrypto para gen_random_bytes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- FASE 1: Crear tabla user_invitations para gestionar invitaciones
CREATE TABLE public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  role app_role NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'revoked'))
);

-- Índices para búsqueda rápida
CREATE INDEX idx_invitations_token ON public.user_invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_invitations_status ON public.user_invitations(status);

-- RLS policies
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- SuperAdmins pueden ver todas las invitaciones
CREATE POLICY "SuperAdmins can view all invitations"
  ON public.user_invitations FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- SuperAdmins pueden crear invitaciones
CREATE POLICY "SuperAdmins can create invitations"
  ON public.user_invitations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- SuperAdmins pueden actualizar invitaciones
CREATE POLICY "SuperAdmins can update invitations"
  ON public.user_invitations FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- Función para limpiar tokens expirados
CREATE OR REPLACE FUNCTION public.clean_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;