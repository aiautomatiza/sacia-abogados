-- Migration: Add Contact Statuses System
-- Description: Configurable contact statuses per tenant with full history tracking
-- Date: 2026-01-12

-- =====================================================
-- 0. CREATE HELPER FUNCTION: update_updated_at_column
-- =====================================================
-- This function automatically updates the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. CREATE TABLE: crm_contact_statuses
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_contact_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color: #3b82f6
  icon TEXT NULL, -- Lucide icon name: 'user-check', 'phone', etc.
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT crm_contact_statuses_name_tenant_unique UNIQUE (tenant_id, name),
  CONSTRAINT crm_contact_statuses_order_check CHECK (display_order >= 0),
  CONSTRAINT crm_contact_statuses_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_contact_statuses_tenant
  ON public.crm_contact_statuses(tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_contact_statuses_active
  ON public.crm_contact_statuses(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_crm_contact_statuses_default
  ON public.crm_contact_statuses(tenant_id, is_default)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_crm_contact_statuses_display_order
  ON public.crm_contact_statuses(tenant_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_crm_contact_statuses
  BEFORE UPDATE ON public.crm_contact_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.crm_contact_statuses IS 'Configurable contact statuses per tenant';
COMMENT ON COLUMN public.crm_contact_statuses.name IS 'Display name of the status';
COMMENT ON COLUMN public.crm_contact_statuses.color IS 'Hex color code for UI display';
COMMENT ON COLUMN public.crm_contact_statuses.icon IS 'Lucide icon name for visual representation';
COMMENT ON COLUMN public.crm_contact_statuses.display_order IS 'Order for sorting statuses in UI';
COMMENT ON COLUMN public.crm_contact_statuses.is_default IS 'Default status assigned to new contacts';
COMMENT ON COLUMN public.crm_contact_statuses.is_active IS 'Soft delete flag - inactive statuses hidden from UI';

-- =====================================================
-- 2. MODIFY TABLE: crm_contacts (Add status columns)
-- =====================================================
ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS status_id UUID NULL
  REFERENCES public.crm_contact_statuses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS status_updated_by UUID NULL
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for JOINs and filtering
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status
  ON public.crm_contacts(status_id);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_status
  ON public.crm_contacts(tenant_id, status_id);

-- Comments
COMMENT ON COLUMN public.crm_contacts.status_id IS 'Current contact status';
COMMENT ON COLUMN public.crm_contacts.status_updated_at IS 'Timestamp of last status change';
COMMENT ON COLUMN public.crm_contacts.status_updated_by IS 'User who changed the status';

-- =====================================================
-- 3. CREATE TABLE: crm_contact_status_history
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_contact_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  status_id UUID NULL REFERENCES public.crm_contact_statuses(id) ON DELETE SET NULL,
  previous_status_id UUID NULL REFERENCES public.crm_contact_statuses(id) ON DELETE SET NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notes TEXT NULL, -- Optional: reason for change

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for history queries
CREATE INDEX IF NOT EXISTS idx_crm_contact_status_history_contact
  ON public.crm_contact_status_history(contact_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_contact_status_history_tenant
  ON public.crm_contact_status_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_crm_contact_status_history_status
  ON public.crm_contact_status_history(status_id);

CREATE INDEX IF NOT EXISTS idx_crm_contact_status_history_changed_at
  ON public.crm_contact_status_history(tenant_id, changed_at DESC);

-- Comments
COMMENT ON TABLE public.crm_contact_status_history IS 'Audit log for contact status changes';
COMMENT ON COLUMN public.crm_contact_status_history.notes IS 'Optional reason or note for the status change';

-- =====================================================
-- 4. RLS POLICIES: crm_contact_statuses
-- =====================================================
ALTER TABLE public.crm_contact_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view statuses from their tenant"
  ON public.crm_contact_statuses FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can insert statuses in their tenant"
  ON public.crm_contact_statuses FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can update statuses in their tenant"
  ON public.crm_contact_statuses FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can delete statuses in their tenant"
  ON public.crm_contact_statuses FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================
-- 5. RLS POLICIES: crm_contact_status_history
-- =====================================================
ALTER TABLE public.crm_contact_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history from their tenant"
  ON public.crm_contact_status_history FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "System can insert history"
  ON public.crm_contact_status_history FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================
-- 6. FUNCTION: Ensure single default status per tenant
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_single_default_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a status as default, unset all other defaults for this tenant
  IF NEW.is_default = true THEN
    UPDATE public.crm_contact_statuses
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_single_default_status
  BEFORE INSERT OR UPDATE ON public.crm_contact_statuses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_status();

-- =====================================================
-- 7. FUNCTION: Auto-log status changes to history
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_contact_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change on UPDATE when status actually changed
  IF (TG_OP = 'UPDATE' AND NEW.status_id IS DISTINCT FROM OLD.status_id) THEN
    INSERT INTO public.crm_contact_status_history (
      contact_id,
      status_id,
      previous_status_id,
      changed_by,
      changed_at,
      tenant_id
    ) VALUES (
      NEW.id,
      NEW.status_id,
      OLD.status_id,
      COALESCE(NEW.status_updated_by, auth.uid()),
      COALESCE(NEW.status_updated_at, now()),
      NEW.tenant_id
    );
  END IF;

  -- Log initial status on INSERT if status is set
  IF (TG_OP = 'INSERT' AND NEW.status_id IS NOT NULL) THEN
    INSERT INTO public.crm_contact_status_history (
      contact_id,
      status_id,
      previous_status_id,
      changed_by,
      changed_at,
      tenant_id
    ) VALUES (
      NEW.id,
      NEW.status_id,
      NULL,
      COALESCE(NEW.status_updated_by, auth.uid()),
      COALESCE(NEW.status_updated_at, now()),
      NEW.tenant_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_contact_status_changes
  AFTER INSERT OR UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contact_status_change();

-- =====================================================
-- 8. FUNCTION: Get default status ID for tenant
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_default_status_id(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_status_id UUID;
BEGIN
  SELECT id INTO v_status_id
  FROM public.crm_contact_statuses
  WHERE tenant_id = p_tenant_id
    AND is_default = true
    AND is_active = true
  LIMIT 1;

  RETURN v_status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_default_status_id(UUID) IS 'Returns the default status ID for a tenant, or NULL if none exists';

-- =====================================================
-- 9. SEED DATA: Default statuses for existing tenants
-- =====================================================
-- Insert default statuses for all existing tenants
-- Note: This is optional and can be customized per business needs

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- Loop through all existing tenants
  FOR tenant_record IN SELECT id FROM public.tenants LOOP
    -- Check if tenant already has statuses (prevent duplicate execution)
    IF NOT EXISTS (
      SELECT 1 FROM public.crm_contact_statuses
      WHERE tenant_id = tenant_record.id
    ) THEN
      -- Insert default statuses
      INSERT INTO public.crm_contact_statuses (tenant_id, name, color, icon, display_order, is_default, is_active)
      VALUES
        (tenant_record.id, 'Nuevo', '#22c55e', 'user-plus', 0, true, true),
        (tenant_record.id, 'En contacto', '#3b82f6', 'phone', 1, false, true),
        (tenant_record.id, 'Cliente', '#8b5cf6', 'check-circle', 2, false, true),
        (tenant_record.id, 'Inactivo', '#64748b', 'x-circle', 3, false, true);
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
