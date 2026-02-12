-- Add external_crm_id column to crm_contacts
-- This stores the contact's ID in an external CRM system (e.g., GoHighLevel, HubSpot)
ALTER TABLE crm_contacts ADD COLUMN external_crm_id TEXT;

-- Unique partial index: an external_crm_id can only exist once per tenant
CREATE UNIQUE INDEX idx_crm_contacts_external_crm_id
  ON crm_contacts (tenant_id, external_crm_id)
  WHERE external_crm_id IS NOT NULL;
