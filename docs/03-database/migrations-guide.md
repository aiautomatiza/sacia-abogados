# Migrations Guide

Como crear, aplicar y gestionar migraciones de base de datos.

## Estructura de Migraciones

```
supabase/
└── migrations/
    ├── 20251113163427_initial.sql
    ├── 20260103_add_integration_tables.sql
    ├── 20260127_appointments_system.sql
    └── ...
```

## Nomenclatura

```
YYYYMMDD_description.sql
```

O con timestamp completo:

```
YYYYMMDDHHMMSS_uuid_description.sql
```

## Crear Nueva Migracion

### 1. Crear archivo

```bash
# Formato: YYYYMMDD_descripcion.sql
touch supabase/migrations/20260203_add_new_feature.sql
```

### 2. Escribir SQL

```sql
-- 20260203_add_new_feature.sql

-- Crear tabla
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Crear policies
CREATE POLICY "tenant_select" ON new_feature
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_insert" ON new_feature
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_update" ON new_feature
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_delete" ON new_feature
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Crear indices
CREATE INDEX idx_new_feature_tenant ON new_feature(tenant_id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE new_feature;

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON new_feature
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Aplicar Migraciones

### Usando Supabase CLI

```bash
# Aplicar todas las migraciones pendientes
supabase db push

# Ver estado de migraciones
supabase migration list

# Reset completo (desarrollo)
supabase db reset
```

### Manualmente en Dashboard

1. Ir a Supabase Dashboard
2. SQL Editor
3. Pegar y ejecutar SQL

## Tipos de Cambios

### Agregar Columna

```sql
-- Agregar columna nueva
ALTER TABLE crm_contacts
ADD COLUMN email TEXT;

-- Con default
ALTER TABLE crm_contacts
ADD COLUMN status TEXT DEFAULT 'active';

-- NOT NULL con default
ALTER TABLE crm_contacts
ADD COLUMN priority INT NOT NULL DEFAULT 0;
```

### Modificar Columna

```sql
-- Cambiar tipo
ALTER TABLE crm_contacts
ALTER COLUMN numero TYPE VARCHAR(20);

-- Agregar NOT NULL
ALTER TABLE crm_contacts
ALTER COLUMN nombre SET NOT NULL;

-- Quitar NOT NULL
ALTER TABLE crm_contacts
ALTER COLUMN nombre DROP NOT NULL;
```

### Eliminar Columna

```sql
ALTER TABLE crm_contacts
DROP COLUMN IF EXISTS old_column;
```

### Crear Indice

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_email
ON crm_contacts(email);

-- Indice unico
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_tenant_numero
ON crm_contacts(tenant_id, numero);
```

### Crear Enum

```sql
-- Crear enum
CREATE TYPE feature_status AS ENUM ('active', 'inactive', 'pending');

-- Agregar valor a enum existente
ALTER TYPE call_state ADD VALUE 'rescheduled';
```

### Crear Funcion

```sql
CREATE OR REPLACE FUNCTION my_function(p_param TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'Result: ' || p_param;
END;
$$ LANGUAGE plpgsql;
```

### Crear Vista

```sql
CREATE OR REPLACE VIEW v_feature_summary AS
SELECT
  tenant_id,
  COUNT(*) as total,
  MAX(created_at) as last_created
FROM new_feature
GROUP BY tenant_id;
```

## Migracion con Datos

### Agregar columna con datos existentes

```sql
-- 1. Agregar columna nullable
ALTER TABLE crm_contacts
ADD COLUMN normalized_phone TEXT;

-- 2. Poblar datos
UPDATE crm_contacts
SET normalized_phone = regexp_replace(numero, '[^0-9]', '', 'g');

-- 3. (Opcional) Hacer NOT NULL
ALTER TABLE crm_contacts
ALTER COLUMN normalized_phone SET NOT NULL;
```

### Migrar datos entre tablas

```sql
-- Insertar desde otra tabla
INSERT INTO new_table (id, tenant_id, name)
SELECT id, tenant_id, old_name
FROM old_table
WHERE condition = true;
```

## Rollback

Supabase no tiene rollback automatico. Crear migracion inversa:

```sql
-- 20260204_revert_new_feature.sql

-- Eliminar en orden inverso
DROP TRIGGER IF EXISTS set_updated_at ON new_feature;
DROP POLICY IF EXISTS "tenant_select" ON new_feature;
DROP POLICY IF EXISTS "tenant_insert" ON new_feature;
DROP POLICY IF EXISTS "tenant_update" ON new_feature;
DROP POLICY IF EXISTS "tenant_delete" ON new_feature;
DROP INDEX IF EXISTS idx_new_feature_tenant;
DROP TABLE IF EXISTS new_feature;
```

## Best Practices

### 1. Usar IF EXISTS / IF NOT EXISTS

```sql
-- Seguro si ya existe
CREATE TABLE IF NOT EXISTS feature (...);
DROP TABLE IF EXISTS feature;
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

### 2. Transacciones

```sql
BEGIN;

ALTER TABLE contacts ADD COLUMN email TEXT;
UPDATE contacts SET email = 'unknown@email.com' WHERE email IS NULL;
ALTER TABLE contacts ALTER COLUMN email SET NOT NULL;

COMMIT;
```

### 3. Comentarios

```sql
-- =============================================
-- Migration: Add email verification system
-- Date: 2026-02-03
-- Author: Developer Name
-- Description: Adds tables for email verification
-- =============================================

-- [Migration SQL here]
```

### 4. Separar por responsabilidad

```sql
-- 20260203_001_create_feature_table.sql
-- 20260203_002_add_feature_policies.sql
-- 20260203_003_add_feature_indexes.sql
```

## Actualizar Tipos TypeScript

Despues de cambios en schema:

```bash
# Si usas Supabase CLI con generacion de tipos
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

O actualizar manualmente `src/integrations/supabase/types.ts`.

## Checklist de Migracion

- [ ] SQL es idempotente (IF EXISTS/IF NOT EXISTS)
- [ ] RLS habilitado y policies creadas
- [ ] Indices para queries frecuentes
- [ ] Realtime habilitado si necesario
- [ ] Trigger de updated_at si tiene columna
- [ ] Tipos TypeScript actualizados
- [ ] Documentacion actualizada

## Ejemplo Completo

```sql
-- 20260203_add_notifications_system.sql
-- =============================================
-- Migration: Notifications System
-- =============================================

-- Crear tipo enum
CREATE TYPE notification_type AS ENUM (
  'message',
  'call',
  'appointment',
  'campaign',
  'system'
);

-- Crear tabla
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMP,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

-- Indices
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at)
WHERE read_at IS NULL;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Funcion para marcar como leidas
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[])
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Siguiente Paso

Continua con los [Schemas detallados](./schemas/) para documentacion de tablas especificas.
