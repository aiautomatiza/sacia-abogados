# Tabla: tenants

## Descripcion

Tabla principal de organizaciones en el sistema multi-tenant. Cada tenant representa una empresa u organizacion que usa el CRM.

## Columnas

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `name` | TEXT | NO | - | Nombre de la organizacion |
| `email` | TEXT | SI | NULL | Email de contacto |
| `status` | TEXT | SI | `'active'` | Estado: 'active', 'inactive', 'suspended' |
| `created_at` | TIMESTAMP | SI | `NOW()` | Fecha de creacion |
| `updated_at` | TIMESTAMP | SI | `NOW()` | Ultima actualizacion |

## Relaciones

### Tablas que referencian tenants

| Tabla | FK | Relacion |
|-------|-------|----------|
| `profiles` | `tenant_id` | 1:N |
| `crm_contacts` | `tenant_id` | 1:N |
| `conversations` | `tenant_id` | 1:N |
| `crm_calls` | `tenant_id` | 1:N |
| `campaigns` | `tenant_id` | 1:N |
| `appointments` | `tenant_id` | 1:N |
| `tenant_settings` | `tenant_id` | 1:1 |
| `tenant_credentials` | `tenant_id` | 1:1 |
| `tenant_locations` | `tenant_id` | 1:N |
| `custom_fields` | `tenant_id` | 1:N |
| `conversation_tags` | `tenant_id` | 1:N |
| `whatsapp_templates` | `tenant_id` | 1:N |
| `webhooks` | `tenant_id` | 1:N |

## RLS Policies

```sql
-- Solo super_admin puede ver tenants
CREATE POLICY "super_admin_select" ON tenants
FOR SELECT USING (is_super_admin(auth.uid()));

-- Solo super_admin puede crear tenants
CREATE POLICY "super_admin_insert" ON tenants
FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- Solo super_admin puede modificar tenants
CREATE POLICY "super_admin_update" ON tenants
FOR UPDATE USING (is_super_admin(auth.uid()));

-- Solo super_admin puede eliminar tenants
CREATE POLICY "super_admin_delete" ON tenants
FOR DELETE USING (is_super_admin(auth.uid()));
```

## Indices

```sql
CREATE INDEX idx_tenants_status ON tenants(status);
```

## Queries Comunes

### Obtener todos los tenants (super_admin)

```sql
SELECT * FROM tenants
ORDER BY created_at DESC;
```

### Obtener tenant con estadisticas

```sql
SELECT
  t.*,
  (SELECT COUNT(*) FROM profiles WHERE tenant_id = t.id) as users_count,
  (SELECT COUNT(*) FROM crm_contacts WHERE tenant_id = t.id) as contacts_count,
  (SELECT COUNT(*) FROM conversations WHERE tenant_id = t.id) as conversations_count
FROM tenants t
WHERE t.id = $1;
```

### Crear nuevo tenant

```sql
INSERT INTO tenants (name, email)
VALUES ('Empresa ABC', 'admin@empresa.com')
RETURNING *;
```

## TypeScript Type

```typescript
import type { Database } from '@/integrations/supabase/types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

// Ejemplo
const tenant: Tenant = {
  id: 'uuid',
  name: 'Empresa ABC',
  email: 'admin@empresa.com',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};
```

## Notas

- Solo super_admin puede gestionar tenants
- Al crear un tenant, tambien crear `tenant_settings` y `tenant_credentials`
- Los usuarios normales no ven esta tabla directamente
