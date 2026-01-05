-- INTEGRACIÓN CON MIDDLEWARE - TABLAS DE GESTIÓN DE INTEGRACIONES

-- Tabla de credenciales de integración OAuth
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificación de la integración
  integration_name TEXT NOT NULL,         -- ej: "zoho", "salesforce", "hubspot"
  integration_type TEXT NOT NULL,         -- ej: "crm", "erp"

  -- Estado de la conexión
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'error')),

  -- Metadata
  provider_user_id TEXT,                  -- ID del usuario en el sistema externo
  provider_account_name TEXT,             -- Nombre de cuenta en el proveedor
  scopes TEXT[],                          -- Permisos otorgados

  -- Sincronización
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(tenant_id, integration_name)
);

CREATE INDEX idx_integration_credentials_tenant ON integration_credentials(tenant_id);
CREATE INDEX idx_integration_credentials_status ON integration_credentials(status);

-- RLS Policies
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage integration credentials"
ON integration_credentials FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their tenant integrations"
ON integration_credentials FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Tabla de configuración de sincronización
CREATE TABLE integration_sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integration_credentials(id) ON DELETE CASCADE,

  -- Configuración de sincronización
  enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'manual' CHECK (sync_frequency IN ('manual', 'hourly', 'daily')),

  -- Mapeo de campos (JSON flexible)
  field_mappings JSONB DEFAULT '{}',

  -- Filtros (opcional: sincronizar solo ciertos contactos)
  sync_filters JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(integration_id)
);

CREATE INDEX idx_integration_sync_settings_integration ON integration_sync_settings(integration_id);

ALTER TABLE integration_sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage sync settings"
ON integration_sync_settings FOR ALL
TO authenticated
USING (
  integration_id IN (
    SELECT id FROM integration_credentials
    WHERE public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Users can view their tenant sync settings"
ON integration_sync_settings FOR SELECT
TO authenticated
USING (
  integration_id IN (
    SELECT ic.id FROM integration_credentials ic
    WHERE ic.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
);

-- Tabla de logs de sincronización
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integration_credentials(id) ON DELETE SET NULL,

  -- Tipo de operación
  operation TEXT NOT NULL CHECK (operation IN ('export_contacts', 'export_conversations')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound')),

  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),

  -- Estadísticas
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,

  -- Detalles
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  triggered_by UUID REFERENCES auth.users(id),
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'automatic'))
);

CREATE INDEX idx_sync_logs_tenant ON sync_logs(tenant_id, created_at DESC);
CREATE INDEX idx_sync_logs_integration ON sync_logs(integration_id, created_at DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status) WHERE status IN ('pending', 'processing');

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage sync logs"
ON sync_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their tenant sync logs"
ON sync_logs FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Triggers para updated_at
CREATE TRIGGER handle_integration_credentials_updated_at
BEFORE UPDATE ON integration_credentials
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_integration_sync_settings_updated_at
BEFORE UPDATE ON integration_sync_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
