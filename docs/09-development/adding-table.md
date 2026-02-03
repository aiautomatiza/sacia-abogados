# Adding a New Table

Guia para agregar una nueva tabla a la base de datos.

## Checklist

- [ ] Crear migracion SQL
- [ ] Habilitar RLS
- [ ] Crear policies
- [ ] Crear indices
- [ ] Habilitar Realtime (si aplica)
- [ ] Actualizar tipos TypeScript
- [ ] Documentar schema

## Paso 1: Crear Migracion

```bash
# Crear archivo de migracion
touch supabase/migrations/20260203_add_nueva_tabla.sql
```

## Paso 2: Escribir SQL

```sql
-- supabase/migrations/20260203_add_nueva_tabla.sql
-- =============================================
-- Migration: Add nueva_tabla
-- Date: 2026-02-03
-- =============================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS nueva_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;

-- 3. Crear policies
CREATE POLICY "tenant_select" ON nueva_tabla
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "tenant_insert" ON nueva_tabla
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_update" ON nueva_tabla
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_delete" ON nueva_tabla
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- 4. Crear indices
CREATE INDEX idx_nueva_tabla_tenant_id ON nueva_tabla(tenant_id);
CREATE INDEX idx_nueva_tabla_status ON nueva_tabla(status);
CREATE INDEX idx_nueva_tabla_created_at ON nueva_tabla(created_at DESC);

-- 5. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE nueva_tabla;

-- 6. Trigger para updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON nueva_tabla
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Paso 3: Aplicar Migracion

### Desarrollo local

```bash
supabase db push
```

### Produccion

1. Dashboard > SQL Editor
2. Pegar y ejecutar SQL

O via CLI:

```bash
supabase db push --project-ref <project-id>
```

## Paso 4: Actualizar Tipos TypeScript

### Opcion A: Regenerar automaticamente

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Opcion B: Agregar manualmente

```typescript
// src/integrations/supabase/types.ts
// Agregar en Database.public.Tables:

nueva_tabla: {
  Row: {
    id: string
    tenant_id: string
    name: string
    description: string | null
    status: string | null
    metadata: Json
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    tenant_id: string
    name: string
    description?: string | null
    status?: string | null
    metadata?: Json
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    tenant_id?: string
    name?: string
    description?: string | null
    status?: string | null
    metadata?: Json
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "nueva_tabla_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
  ]
}
```

## Paso 5: Documentar Schema

Crear `docs/03-database/schemas/nueva-tabla.md`:

```markdown
# Tabla: nueva_tabla

## Descripcion
[Descripcion de la tabla]

## Columnas
| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| id | UUID | NO | Primary key |
| tenant_id | UUID | NO | FK a tenants |
| ...

## RLS Policies
[Incluir SQL]

## Indices
[Listar indices]
```

## Patrones Comunes

### Tabla con Enum

```sql
-- Crear enum primero
CREATE TYPE nueva_tabla_status AS ENUM ('active', 'inactive', 'pending');

-- Usar en tabla
CREATE TABLE nueva_tabla (
  ...
  status nueva_tabla_status DEFAULT 'active',
  ...
);
```

### Tabla con Foreign Key a Contact

```sql
CREATE TABLE nueva_tabla (
  ...
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  ...
);

CREATE INDEX idx_nueva_tabla_contact ON nueva_tabla(contact_id);
```

### Tabla de Relacion (Many-to-Many)

```sql
CREATE TABLE tabla_item_tags (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
```

### Tabla con JSON Attributes

```sql
CREATE TABLE nueva_tabla (
  ...
  attributes JSONB DEFAULT '{}',
  ...
);

-- Indice para busqueda en JSON
CREATE INDEX idx_nueva_tabla_attributes ON nueva_tabla USING gin(attributes);
```

## Verificar Migracion

```sql
-- Verificar tabla existe
SELECT * FROM nueva_tabla LIMIT 1;

-- Verificar RLS habilitado
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'nueva_tabla';

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'nueva_tabla';

-- Verificar indices
SELECT indexname FROM pg_indexes WHERE tablename = 'nueva_tabla';
```

## Rollback

Si necesitas revertir:

```sql
-- supabase/migrations/20260204_revert_nueva_tabla.sql
DROP TRIGGER IF EXISTS set_updated_at ON nueva_tabla;
DROP POLICY IF EXISTS "tenant_select" ON nueva_tabla;
DROP POLICY IF EXISTS "tenant_insert" ON nueva_tabla;
DROP POLICY IF EXISTS "tenant_update" ON nueva_tabla;
DROP POLICY IF EXISTS "tenant_delete" ON nueva_tabla;
DROP TABLE IF EXISTS nueva_tabla;
DROP TYPE IF EXISTS nueva_tabla_status;
```

## Checklist Final

- [ ] Tabla creada con todas las columnas
- [ ] RLS habilitado
- [ ] 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Indices en campos de busqueda
- [ ] Realtime habilitado (si necesario)
- [ ] Trigger updated_at
- [ ] Tipos TypeScript actualizados
- [ ] Documentacion creada
