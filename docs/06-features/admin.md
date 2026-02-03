# Feature: Admin

Panel de administración para super admins.

## Descripción

El módulo Admin proporciona gestión centralizada de tenants, usuarios y configuración del sistema. Solo accesible para usuarios con rol `super_admin`.

## Casos de Uso

1. Crear nuevo tenant (empresa/cliente)
2. Gestionar usuarios de todos los tenants
3. Ver estadísticas globales del sistema
4. Configurar ajustes por tenant

## Estructura de Archivos

```
src/features/admin/
├── components/
│   ├── TenantsList.tsx
│   ├── TenantForm.tsx
│   ├── TenantCard.tsx
│   ├── UsersList.tsx
│   └── SystemStats.tsx
├── hooks/
│   ├── useTenants.ts
│   ├── useTenantMutations.ts
│   ├── useAllUsers.ts
│   └── useSystemStats.ts
├── services/
│   ├── tenants.service.ts
│   └── admin-users.service.ts
└── types/
    └── index.ts
```

## Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `tenants` | Empresas/clientes del sistema |
| `profiles` | Usuarios (linked a auth.users) |
| `user_roles` | Roles por usuario |
| `tenant_settings` | Configuración por tenant |

### Queries Comunes

```typescript
// Listar todos los tenants
const { data } = await supabase
  .from('tenants')
  .select(`
    *,
    profiles:profiles(count),
    contacts:crm_contacts(count)
  `)
  .order('created_at', { ascending: false });

// Estadísticas globales
const { data } = await supabase.rpc('get_system_stats');
```

## Hooks

### useTenants

```typescript
// src/features/admin/hooks/useTenants.ts
export function useTenants(page: number = 1) {
  return useQuery({
    queryKey: ['tenants', page],
    queryFn: () => tenantsService.getTenants(page),
    staleTime: 60 * 1000,
  });
}
```

### useTenantMutations

```typescript
export function useTenantMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: tenantsService.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant creado');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => tenantsService.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant actualizado');
    },
  });

  const remove = useMutation({
    mutationFn: tenantsService.deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant eliminado');
    },
  });

  return { create, update, remove };
}
```

## Componentes

### TenantsList

```typescript
// src/features/admin/components/TenantsList.tsx
interface Props {
  tenants: Tenant[];
  onSelect: (tenant: Tenant) => void;
}

export function TenantsList({ tenants, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {tenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          onClick={() => onSelect(tenant)}
        />
      ))}
    </div>
  );
}
```

### TenantForm

```typescript
// Campos del formulario
const tenantSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  slug: z.string().min(1, 'Slug requerido').regex(/^[a-z0-9-]+$/),
  settings: z.object({
    max_users: z.number().min(1).default(10),
    features_enabled: z.array(z.string()).default([]),
  }),
});
```

## Rutas

| Ruta | Componente | Permisos |
|------|------------|----------|
| `/admin` | AdminDashboard | super_admin |
| `/admin/tenants` | TenantsPage | super_admin |
| `/admin/tenants/:id` | TenantDetailPage | super_admin |
| `/admin/users` | AllUsersPage | super_admin |

## Protección de Rutas

```typescript
// src/App.tsx
<Route element={<SuperAdminRoute />}>
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<AdminDashboard />} />
    <Route path="tenants" element={<TenantsPage />} />
    <Route path="tenants/:id" element={<TenantDetailPage />} />
    <Route path="users" element={<AllUsersPage />} />
  </Route>
</Route>
```

```typescript
// src/components/auth/SuperAdminRoute.tsx
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = useRole();

  if (isLoading) return <LoadingSpinner />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
```

## Edge Functions

### manage-tenant-settings

Gestiona configuración de tenant desde panel admin.

```typescript
// POST /functions/v1/manage-tenant-settings
interface Request {
  tenant_id: string;
  action: 'get' | 'update';
  settings?: TenantSettings;
}
```

## Permisos y Seguridad

- Solo `super_admin` puede acceder
- RLS no aplica filtro de tenant para super_admin
- Logs de auditoría para acciones críticas

```sql
-- Policy para super_admin
CREATE POLICY "super_admin_full_access" ON tenants
FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);
```

## Flujo: Crear Tenant

1. Super admin llena formulario
2. Crear registro en `tenants`
3. Crear usuario admin del tenant
4. Configurar settings iniciales
5. Enviar invitación por email

```typescript
async function createTenantWithAdmin(data: CreateTenantData) {
  // 1. Crear tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .insert({ name: data.name, slug: data.slug })
    .select()
    .single();

  // 2. Invitar admin
  const { data: invitation } = await supabase
    .from('invitations')
    .insert({
      tenant_id: tenant.id,
      email: data.adminEmail,
      role: 'admin',
    })
    .select()
    .single();

  // 3. Enviar email
  await supabase.functions.invoke('send-invitation-email', {
    body: { invitation_id: invitation.id },
  });

  return tenant;
}
```
