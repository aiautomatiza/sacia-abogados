# Authentication & Authorization

Sistema de autenticacion y control de acceso basado en roles (RBAC).

## Arquitectura de Auth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE AUTH                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        GoTrue Service                                ││
│  │  - Maneja login/logout                                              ││
│  │  - Emite JWT tokens                                                 ││
│  │  - Almacena usuarios en auth.users                                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ JWT Token
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                       AuthContext                                    ││
│  │  - user (datos del usuario)                                         ││
│  │  - session (sesion activa)                                          ││
│  │  - scope (userId, tenantId, isSuperAdmin)                           ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                  │                                       │
│                                  ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Protected Routes                                  ││
│  │  - <ProtectedRoute> - Requiere autenticacion                        ││
│  │  - <SuperAdminRoute> - Solo super_admin                             ││
│  │  - <UserClientRoute> - Solo user_client                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

## Roles del Sistema

| Rol | Permisos | Uso |
|-----|----------|-----|
| `super_admin` | Acceso total, gestion de tenants | Administradores del sistema |
| `user_client` | Acceso a su tenant | Usuarios normales |

## Tablas de Auth

### profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### user_roles

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL, -- 'user_client' | 'super_admin'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enum
CREATE TYPE app_role AS ENUM ('user_client', 'super_admin');
```

## Flujo de Autenticacion

### Login

```
1. Usuario ingresa email/password
2. Supabase Auth valida credenciales
3. Se emite JWT token
4. Frontend almacena session
5. Se carga profile y role
6. Se determina tenant_id
7. Usuario accede al dashboard
```

```typescript
// Implementacion de login
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}
```

### Logout

```typescript
async function signOut() {
  await supabase.auth.signOut();
  // AuthContext se limpia automaticamente
}
```

### Registro (via Invitacion)

El sistema usa invitaciones para registrar usuarios:

```
1. Admin crea invitacion (email, role, tenant_id)
2. Se genera token unico
3. Usuario recibe email con link
4. Usuario completa registro con el token
5. Se crea profile y user_role
```

## AuthContext

```typescript
// src/contexts/auth-context.tsx
interface AuthContextType {
  user: User | null;          // Usuario de Supabase
  session: Session | null;    // Sesion activa
  scope: {
    userId: string;
    tenantId: string | null;
    isSuperAdmin: boolean;
  } | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Uso
function MyComponent() {
  const { user, scope, isAuthenticated, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/auth" />;

  return <div>Bienvenido {user.email}</div>;
}
```

## Hooks de Auth

### useAuth

Hook principal para acceder al estado de autenticacion:

```typescript
import { useAuth } from '@/contexts/auth-context';

function Header() {
  const { user, signOut } = useAuth();

  return (
    <header>
      <span>{user?.email}</span>
      <Button onClick={signOut}>Cerrar sesion</Button>
    </header>
  );
}
```

### useProfile

Hook para obtener perfil y datos del tenant:

```typescript
import { useProfile } from '@/hooks/use-profile';

function Settings() {
  const { profile, tenant, tenantId, isLoading } = useProfile();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>Configuracion de {tenant?.name}</h1>
      <p>Email: {profile?.email}</p>
    </div>
  );
}
```

### useRole

Hook para verificar rol del usuario:

```typescript
import { useRole } from '@/hooks/use-role';

function AdminPanel() {
  const { isSuperAdmin, isUserClient, role, isLoading } = useRole();

  if (isLoading) return <Spinner />;

  if (!isSuperAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <div>Panel de Admin</div>;
}
```

## Rutas Protegidas

### ProtectedRoute

Requiere usuario autenticado:

```typescript
// src/components/ProtectedRoute.tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
```

### SuperAdminRoute

Solo para super_admin:

```typescript
// src/components/SuperAdminRoute.tsx
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useRole();

  if (loading || roleLoading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

### UserClientRoute

Solo para user_client (con tenant):

```typescript
// src/components/UserClientRoute.tsx
function UserClientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, scope } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Debe tener tenant_id
  if (!scope?.tenantId) {
    return <Navigate to="/no-tenant" replace />;
  }

  return <>{children}</>;
}
```

## Configuracion de Rutas

```typescript
// src/App.tsx
const router = createBrowserRouter([
  // Rutas publicas
  { path: '/auth', element: <Auth /> },
  { path: '/accept-invitation', element: <AcceptInvitation /> },

  // Rutas protegidas (cualquier usuario autenticado)
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/settings', element: <Settings /> },
    ],
  },

  // Rutas de usuario con tenant
  {
    element: <UserClientRoute><AppLayout /></UserClientRoute>,
    children: [
      { path: '/contacts', element: <Contacts /> },
      { path: '/conversations', element: <Conversations /> },
      { path: '/calls', element: <Calls /> },
      { path: '/campaigns', element: <Campaigns /> },
    ],
  },

  // Rutas de super admin
  {
    element: <SuperAdminRoute><AppLayout /></SuperAdminRoute>,
    children: [
      { path: '/admin/tenants', element: <Tenants /> },
      { path: '/admin/users', element: <Users /> },
      { path: '/admin/integrations', element: <Integrations /> },
    ],
  },
]);
```

## RLS Policies

### Policy Basica

```sql
-- Usuarios ven solo su tenant
CREATE POLICY "Users see own tenant data"
ON crm_contacts FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

### Policy con Super Admin

```sql
-- Super admin ve todo
CREATE POLICY "Super admin sees all"
ON crm_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);
```

### Funciones Helper

```sql
-- Verificar si es super admin
CREATE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Obtener tenant_id del usuario
CREATE FUNCTION get_user_tenant_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

## Sistema de Invitaciones

### Crear Invitacion

```typescript
// Edge Function: invite-user
const { data: invitation } = await supabase
  .from('user_invitations')
  .insert({
    email,
    full_name: fullName,
    role,
    tenant_id: tenantId,
    invited_by: userId,
    token: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
  })
  .select()
  .single();

// Enviar email con link
await sendInvitationEmail(email, invitation.token);
```

### Aceptar Invitacion

```typescript
// Edge Function: complete-invitation
// 1. Validar token
const { data: invitation } = await supabase
  .from('user_invitations')
  .select('*')
  .eq('token', token)
  .eq('status', 'pending')
  .single();

// 2. Crear usuario en Supabase Auth
const { data: authUser } = await supabase.auth.admin.createUser({
  email: invitation.email,
  password,
  email_confirm: true,
});

// 3. Crear profile
await supabase.from('profiles').insert({
  id: authUser.user.id,
  email: invitation.email,
  tenant_id: invitation.tenant_id,
});

// 4. Asignar rol
await supabase.from('user_roles').insert({
  user_id: authUser.user.id,
  role: invitation.role,
});

// 5. Marcar invitacion como completada
await supabase
  .from('user_invitations')
  .update({ status: 'completed', user_id: authUser.user.id })
  .eq('id', invitation.id);
```

## Seguridad

### Best Practices

1. **Siempre usar RLS** - Nunca confiar solo en el frontend
2. **Validar en backend** - Edge Functions deben verificar permisos
3. **Tokens de invitacion** - Expiran y son de un solo uso
4. **No exponer service_role** - Solo en Edge Functions

### Verificacion en Edge Functions

```typescript
// supabase/functions/_shared/auth.ts
export async function verifyAuth(req: Request, supabase: SupabaseClient) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    throw new Error('Invalid token');
  }

  return user;
}

export async function verifySuperAdmin(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (data?.role !== 'super_admin') {
    throw new Error('Super admin required');
  }
}
```

## Siguiente Paso

Continua con [Database Schema](../03-database/README.md) para ver el modelo de datos completo.
