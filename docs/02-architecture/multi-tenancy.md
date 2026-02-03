# Arquitectura Multi-Tenant

El sistema usa una arquitectura multi-tenant donde cada organizacion (tenant) tiene sus datos completamente aislados.

## Concepto Clave

**CRITICO:** Cada query a la base de datos DEBE filtrar por `tenant_id` para garantizar el aislamiento de datos.

```typescript
// CORRECTO
const { data } = await supabase
  .from('crm_contacts')
  .select('*')
  .eq('tenant_id', tenantId);

// INCORRECTO - Nunca hacer esto
const { data } = await supabase
  .from('crm_contacts')
  .select('*');
```

## Componentes del Sistema Multi-Tenant

### 1. Tabla `tenants`

Cada organizacion es un tenant:

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Tabla `profiles`

Cada usuario pertenece a un tenant:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Row Level Security (RLS)

PostgreSQL RLS garantiza aislamiento a nivel de base de datos:

```sql
-- Ejemplo de policy en crm_contacts
CREATE POLICY "Users can only see their tenant contacts"
ON crm_contacts
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
);
```

## Flujo de Identificacion de Tenant

```
┌─────────────────┐
│   Usuario se    │
│   autentica     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase Auth   │
│ retorna user.id │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Se busca      │
│   profile por   │
│   user.id       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ profile tiene   │
│  tenant_id      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  RLS filtra     │
│  automaticamente│
└─────────────────┘
```

## Implementacion en Frontend

### Hook useProfile

```typescript
// src/hooks/use-profile.ts
export function useProfile() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  return {
    profile,
    tenantId: profile?.tenant_id,
    tenant: profile?.tenants,
    isLoading: !profile,
  };
}
```

### Uso en Componentes

```typescript
function ContactList() {
  const { tenantId } = useProfile();

  const { data: contacts } = useQuery({
    queryKey: ['contacts', tenantId],
    queryFn: () => contactService.getContacts(tenantId),
    enabled: !!tenantId,
  });

  // ...
}
```

### Uso en Services

```typescript
// src/features/contacts/services/contact.service.ts
export async function getContacts(tenantId: string) {
  const { data, error } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

## Implementacion en Backend (Edge Functions)

### Obtener Tenant del Usuario

```typescript
// supabase/functions/_shared/auth.ts
export async function getTenantFromUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.tenant_id) {
    throw new Error('Tenant not found for user');
  }

  return profile.tenant_id;
}
```

### Uso en Edge Function

```typescript
// supabase/functions/create-contact/index.ts
import { getTenantFromUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const supabase = createClient(/* ... */);

  // Obtener usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();

  // Obtener tenant
  const tenantId = await getTenantFromUser(supabase, user.id);

  // Crear contacto con tenant_id
  const { data, error } = await supabase
    .from('crm_contacts')
    .insert({
      ...body,
      tenant_id: tenantId,
    });

  // ...
});
```

## RLS Policies

### Patron Estandar

```sql
-- SELECT: Ver solo datos del tenant
CREATE POLICY "tenant_select" ON table_name
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- INSERT: Insertar solo en su tenant
CREATE POLICY "tenant_insert" ON table_name
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE: Actualizar solo en su tenant
CREATE POLICY "tenant_update" ON table_name
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- DELETE: Eliminar solo en su tenant
CREATE POLICY "tenant_delete" ON table_name
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

### Super Admin Exception

```sql
-- Super admin puede ver todos los tenants
CREATE POLICY "super_admin_select" ON table_name
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);
```

## Realtime con Tenant Filter

```typescript
// Suscripcion filtrada por tenant
useRealtime({
  subscriptions: [
    {
      table: 'crm_contacts',
      event: '*',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['contacts', tenantId]],
    },
  ],
  enabled: !!tenantId,
});
```

## Tablas con tenant_id

Todas estas tablas DEBEN tener `tenant_id`:

| Tabla | Descripcion |
|-------|-------------|
| `crm_contacts` | Contactos |
| `crm_calls` | Llamadas |
| `conversations` | Conversaciones |
| `conversation_messages` | Mensajes |
| `campaigns` | Campanas |
| `campaign_queue` | Cola de campanas |
| `appointments` | Citas |
| `tenant_locations` | Sedes |
| `tenant_settings` | Configuracion |
| `tenant_credentials` | Credenciales |
| `custom_fields` | Campos personalizados |
| `conversation_tags` | Etiquetas |
| `whatsapp_templates` | Templates |
| `webhooks` | Webhooks |
| `integration_credentials` | Integraciones |

## Validacion de Tenant

### En Frontend

```typescript
// Verificar que tenantId existe antes de queries
const { tenantId } = useProfile();

const { data } = useQuery({
  queryKey: ['data', tenantId],
  queryFn: () => fetchData(tenantId),
  enabled: !!tenantId, // No ejecutar sin tenant
});
```

### En Backend

```typescript
// Validar tenant en el body
const { tenant_id } = body;

// Verificar que el usuario tiene acceso al tenant
const userTenantId = await getTenantFromUser(supabase, user.id);

if (tenant_id !== userTenantId) {
  return new Response('Unauthorized', { status: 403 });
}
```

## Errores Comunes

### 1. Olvidar filtrar por tenant

```typescript
// MAL - Expone datos de otros tenants
const { data } = await supabase.from('contacts').select('*');

// BIEN
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenantId);
```

### 2. No incluir tenant_id en INSERT

```typescript
// MAL - RLS rechazara el insert
await supabase.from('contacts').insert({ nombre: 'Juan' });

// BIEN
await supabase.from('contacts').insert({
  nombre: 'Juan',
  tenant_id: tenantId,
});
```

### 3. Query keys sin tenant

```typescript
// MAL - Cache compartido entre tenants
useQuery({ queryKey: ['contacts'] });

// BIEN - Cache aislado por tenant
useQuery({ queryKey: ['contacts', tenantId] });
```

## Testing Multi-Tenant

```typescript
describe('Multi-tenant isolation', () => {
  it('user cannot see other tenant data', async () => {
    // Login como usuario de tenant A
    await loginAs('user-tenant-a@test.com');

    // Intentar acceder a datos de tenant B
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('tenant_id', 'tenant-b-id');

    // RLS debe bloquear
    expect(data).toHaveLength(0);
  });
});
```

## Siguiente Paso

Continua con [Data Flow](./data-flow.md) para ver como fluyen los datos en el sistema.
