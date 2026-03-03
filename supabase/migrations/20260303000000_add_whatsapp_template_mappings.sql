-- 20260303000000_add_whatsapp_template_mappings.sql
-- =============================================
-- Migration: Add WhatsApp Template Mappings
-- Date: 2026-03-03
-- Description: Adds a table to store default variable mappings for WhatsApp templates
-- =============================================

CREATE TABLE IF NOT EXISTS whatsapp_template_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES whatsapp_templates(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT whatsapp_template_mappings_tenant_template_key UNIQUE(tenant_id, template_id)
);

-- RLS
ALTER TABLE whatsapp_template_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON whatsapp_template_mappings
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_insert" ON whatsapp_template_mappings
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_update" ON whatsapp_template_mappings
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_delete" ON whatsapp_template_mappings
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_mappings_tenant ON whatsapp_template_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_mappings_template ON whatsapp_template_mappings(template_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_template_mappings;

-- Trigger para updated_at
CREATE TRIGGER set_whatsapp_template_mappings_updated_at
BEFORE UPDATE ON whatsapp_template_mappings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
