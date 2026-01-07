-- Optimización para consultas de integraciones activas
-- Esta migración añade índices para mejorar el rendimiento de las consultas
-- de sincronización de contactos

-- Índice para búsqueda rápida de integraciones activas por tenant
-- Usado por edge functions para verificar si debe notificar al middleware
CREATE INDEX IF NOT EXISTS idx_integration_credentials_tenant_status
ON integration_credentials(tenant_id, status)
WHERE status = 'active';

-- Comentarios para documentación
COMMENT ON INDEX idx_integration_credentials_tenant_status IS
'Optimiza la búsqueda de integraciones activas por tenant para sincronización de contactos';
