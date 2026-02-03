# Tabla: crm_contacts

## Descripcion

Contactos del CRM. Almacena informacion basica (numero, nombre) y atributos personalizados en JSON.

## Columnas

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `tenant_id` | UUID | NO | - | FK a tenants |
| `numero` | TEXT | NO | - | Numero de telefono (principal) |
| `nombre` | TEXT | SI | NULL | Nombre del contacto |
| `attributes` | JSONB | SI | NULL | Campos personalizados |
| `created_at` | TIMESTAMP | NO | `NOW()` | Fecha de creacion |
| `updated_at` | TIMESTAMP | NO | `NOW()` | Ultima actualizacion |

## Relaciones

### Foreign Keys

| Columna | Referencia |
|---------|------------|
| `tenant_id` | `tenants(id)` |

### Tablas que referencian crm_contacts

| Tabla | FK | Relacion |
|-------|-------|----------|
| `conversations` | `contact_id` | 1:N |
| `crm_calls` | `contact_id` | 1:N |
| `appointments` | `contact_id` | 1:N |

## Estructura de attributes

El campo `attributes` es un JSON flexible que almacena campos personalizados definidos en `custom_fields`:

```json
{
  "email": "cliente@example.com",
  "empresa": "Acme Corp",
  "ciudad": "Madrid",
  "fecha_nacimiento": "1990-05-15",
  "tipo_cliente": "premium",
  "notas": "Cliente VIP desde 2020"
}
```

## RLS Policies

```sql
CREATE POLICY "tenant_contacts_select" ON crm_contacts
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_contacts_insert" ON crm_contacts
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_contacts_update" ON crm_contacts
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_contacts_delete" ON crm_contacts
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

## Indices

```sql
CREATE INDEX idx_contacts_tenant_id ON crm_contacts(tenant_id);
CREATE INDEX idx_contacts_numero ON crm_contacts(numero);
CREATE INDEX idx_contacts_nombre ON crm_contacts(nombre);
CREATE UNIQUE INDEX idx_contacts_tenant_numero ON crm_contacts(tenant_id, numero);
```

## Queries Comunes

### Listar contactos con paginacion

```sql
SELECT *
FROM crm_contacts
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

### Buscar contactos

```sql
SELECT *
FROM crm_contacts
WHERE tenant_id = $1
  AND (
    numero ILIKE '%' || $2 || '%'
    OR nombre ILIKE '%' || $2 || '%'
  )
ORDER BY nombre ASC;
```

### Obtener contacto con conversaciones

```sql
SELECT
  c.*,
  (
    SELECT json_agg(conv.*)
    FROM conversations conv
    WHERE conv.contact_id = c.id
    ORDER BY conv.last_message_at DESC
    LIMIT 5
  ) as recent_conversations
FROM crm_contacts c
WHERE c.id = $1;
```

### Crear contacto

```sql
INSERT INTO crm_contacts (tenant_id, numero, nombre, attributes)
VALUES ($1, $2, $3, $4::jsonb)
RETURNING *;
```

### Actualizar atributos

```sql
UPDATE crm_contacts
SET
  nombre = $2,
  attributes = attributes || $3::jsonb,
  updated_at = NOW()
WHERE id = $1 AND tenant_id = $4
RETURNING *;
```

### Buscar por atributo personalizado

```sql
SELECT *
FROM crm_contacts
WHERE tenant_id = $1
  AND attributes->>'tipo_cliente' = 'premium';
```

## TypeScript Type

```typescript
import type { Database } from '@/integrations/supabase/types';

type Contact = Database['public']['Tables']['crm_contacts']['Row'];
type ContactInsert = Database['public']['Tables']['crm_contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['crm_contacts']['Update'];

// Con atributos tipados
interface ContactAttributes {
  email?: string;
  empresa?: string;
  ciudad?: string;
  tipo_cliente?: string;
  [key: string]: unknown;
}

interface TypedContact extends Omit<Contact, 'attributes'> {
  attributes: ContactAttributes | null;
}
```

## Notas

- `numero` es el identificador principal del contacto
- Constraint UNIQUE en (tenant_id, numero) evita duplicados por tenant
- `attributes` es flexible, pero debe seguir `custom_fields` del tenant
- Campos core (`numero`, `nombre`) NO van en attributes
