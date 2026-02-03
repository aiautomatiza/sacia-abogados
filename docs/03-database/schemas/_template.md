# Tabla: [nombre_tabla]

## Descripcion

[1-2 parrafos describiendo para que sirve esta tabla]

## Columnas

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `tenant_id` | UUID | NO | - | FK a tenants |
| `...` | ... | ... | ... | ... |
| `created_at` | TIMESTAMP | NO | `NOW()` | Fecha de creacion |
| `updated_at` | TIMESTAMP | NO | `NOW()` | Ultima actualizacion |

## Enums (si aplica)

### enum_name

```sql
CREATE TYPE enum_name AS ENUM (
  'value1',
  'value2'
);
```

## Relaciones

### Foreign Keys

| Columna | Referencia |
|---------|------------|
| `tenant_id` | `tenants(id)` |
| `...` | `...` |

### Tablas que referencian esta

| Tabla | FK |
|-------|-------|
| `child_table` | `parent_id` |

## RLS Policies

```sql
CREATE POLICY "tenant_select" ON [tabla]
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_insert" ON [tabla]
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_update" ON [tabla]
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_delete" ON [tabla]
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

## Indices

```sql
CREATE INDEX idx_[tabla]_tenant ON [tabla](tenant_id);
CREATE INDEX idx_[tabla]_... ON [tabla](...);
```

## Queries Comunes

### Listar todos

```sql
SELECT *
FROM [tabla]
WHERE tenant_id = $1
ORDER BY created_at DESC;
```

### Crear

```sql
INSERT INTO [tabla] (tenant_id, ...)
VALUES ($1, ...)
RETURNING *;
```

### Actualizar

```sql
UPDATE [tabla]
SET ..., updated_at = NOW()
WHERE id = $1 AND tenant_id = $2
RETURNING *;
```

### Eliminar

```sql
DELETE FROM [tabla]
WHERE id = $1 AND tenant_id = $2;
```

## TypeScript Type

```typescript
import type { Database } from '@/integrations/supabase/types';

type [Tipo] = Database['public']['Tables']['[tabla]']['Row'];
type [Tipo]Insert = Database['public']['Tables']['[tabla]']['Insert'];
type [Tipo]Update = Database['public']['Tables']['[tabla]']['Update'];
```

## Notas

- [Notas importantes sobre el uso de esta tabla]
- [Restricciones especiales]
- [Consideraciones de performance]
