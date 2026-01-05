-- Modificar tabla tenant_credentials para almacenar credenciales directamente
ALTER TABLE tenant_credentials 
  ADD COLUMN whatsapp_credential TEXT,
  ADD COLUMN calls_credential TEXT;

-- Eliminar las columnas de referencias al vault
ALTER TABLE tenant_credentials 
  DROP COLUMN IF EXISTS whatsapp_secret_name,
  DROP COLUMN IF EXISTS calls_secret_name;