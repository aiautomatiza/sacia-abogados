-- Create custom_fields table for field metadata
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'email', 'phone', 'select', 'date', 'textarea', 'checkbox', 'url')),
  options jsonb DEFAULT '[]'::jsonb,
  required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, field_name)
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_fields
CREATE POLICY "Users can view their tenant custom fields"
  ON public.custom_fields FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their tenant custom fields"
  ON public.custom_fields FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant custom fields"
  ON public.custom_fields FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant custom fields"
  ON public.custom_fields FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER handle_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create GIN index on crm_contacts.attributes for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_crm_contacts_attributes ON public.crm_contacts USING gin(attributes);

-- Create index on numero for fast searches
CREATE INDEX IF NOT EXISTS idx_crm_contacts_numero ON public.crm_contacts(numero);

-- Create composite index for pagination
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_created ON public.crm_contacts(tenant_id, created_at DESC);