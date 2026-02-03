# Routing

Sistema de rutas con React Router y proteccion por rol.

## Configuracion

```typescript
// src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  // Rutas publicas
  { path: '/auth', element: <Auth /> },
  { path: '/accept-invitation', element: <AcceptInvitation /> },

  // Layout principal con rutas protegidas
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <Dashboard /> },
      // ...mas rutas
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

## Rutas por Tipo

### Rutas Publicas

Accesibles sin autenticacion:

```typescript
{
  path: '/auth',
  element: <Auth />
},
{
  path: '/accept-invitation',
  element: <AcceptInvitation />
},
{
  path: '/oauth/callback',
  element: <OAuthCallback />
}
```

### Rutas Protegidas (Authenticated)

Requieren usuario autenticado:

```typescript
{
  element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
  children: [
    { path: '/dashboard', element: <Dashboard /> },
    { path: '/settings', element: <Settings /> },
  ]
}
```

### Rutas de Usuario (UserClient)

Requieren tenant asignado:

```typescript
{
  element: <UserClientRoute><AppLayout /></UserClientRoute>,
  children: [
    { path: '/contacts', element: <Contacts /> },
    { path: '/conversations', element: <Conversations /> },
    { path: '/calls', element: <Calls /> },
    { path: '/campaigns', element: <Campaigns /> },
    { path: '/appointments', element: <Appointments /> },
    { path: '/locations', element: <Locations /> },
  ]
}
```

### Rutas de Super Admin

Solo para super_admin:

```typescript
{
  element: <SuperAdminRoute><AppLayout /></SuperAdminRoute>,
  children: [
    { path: '/admin/tenants', element: <Tenants /> },
    { path: '/admin/users', element: <Users /> },
    { path: '/admin/integrations', element: <Integrations /> },
  ]
}
```

## Componentes de Proteccion

### ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
```

### SuperAdminRoute

```typescript
// src/components/SuperAdminRoute.tsx
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useRole();

  if (loading || roleLoading) {
    return <FullPageSpinner />;
  }

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

```typescript
// src/components/UserClientRoute.tsx
export function UserClientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, scope } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!scope?.tenantId) {
    return <Navigate to="/no-tenant" replace />;
  }

  return <>{children}</>;
}
```

## Navegacion

### Navegacion Programatica

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/contacts');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleReplace = () => {
    navigate('/dashboard', { replace: true });
  };
}
```

### Links

```typescript
import { Link, NavLink } from 'react-router-dom';

// Link basico
<Link to="/contacts">Contactos</Link>

// NavLink con estado activo
<NavLink
  to="/contacts"
  className={({ isActive }) =>
    cn('nav-link', isActive && 'nav-link-active')
  }
>
  Contactos
</NavLink>
```

## URL Params

### Parametros de Ruta

```typescript
// Ruta
{ path: '/contacts/:contactId', element: <ContactDetail /> }

// Componente
import { useParams } from 'react-router-dom';

function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  // contactId es el valor de la URL
}
```

### Query Params

```typescript
import { useSearchParams } from 'react-router-dom';

function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer params
  const conversationId = searchParams.get('conversationId');
  const channel = searchParams.get('channel') || 'all';

  // Escribir params
  const selectConversation = (id: string) => {
    setSearchParams(prev => {
      prev.set('conversationId', id);
      return prev;
    });
  };

  // Eliminar param
  const clearSelection = () => {
    setSearchParams(prev => {
      prev.delete('conversationId');
      return prev;
    });
  };
}
```

## Layout con Outlet

```typescript
// src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet /> {/* Aqui se renderizan las rutas hijas */}
      </main>
    </div>
  );
}
```

## Sidebar Navigation

```typescript
// src/components/layout/Sidebar.tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Contactos', href: '/contacts', icon: Users },
  { name: 'Conversaciones', href: '/conversations', icon: MessageSquare },
  { name: 'Llamadas', href: '/calls', icon: Phone },
  { name: 'Campanas', href: '/campaigns', icon: Megaphone },
  { name: 'Citas', href: '/appointments', icon: Calendar },
];

const adminNavigation = [
  { name: 'Tenants', href: '/admin/tenants', icon: Building },
  { name: 'Usuarios', href: '/admin/users', icon: UserCog },
  { name: 'Integraciones', href: '/admin/integrations', icon: Plug },
];

export function Sidebar() {
  const { isSuperAdmin } = useRole();

  return (
    <aside className="w-64 border-r">
      <nav className="space-y-1 p-4">
        {navigation.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn('nav-item', isActive && 'nav-item-active')
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}

        {isSuperAdmin && (
          <>
            <Separator className="my-4" />
            <p className="px-3 text-xs font-semibold text-muted-foreground">
              Admin
            </p>
            {adminNavigation.map(item => (
              <NavLink key={item.href} to={item.href} /* ... */>
                {/* ... */}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
```

## Error Boundaries

```typescript
// src/pages/NotFound.tsx
export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Pagina no encontrada</p>
      <Link to="/dashboard">
        <Button className="mt-4">Volver al inicio</Button>
      </Link>
    </div>
  );
}

// En router
{
  path: '*',
  element: <NotFound />
}
```

## Tabla de Rutas

| Ruta | Componente | Rol | Descripcion |
|------|------------|-----|-------------|
| `/auth` | Auth | Public | Login/Register |
| `/accept-invitation` | AcceptInvitation | Public | Completar invitacion |
| `/oauth/callback` | OAuthCallback | Auth | OAuth callback |
| `/dashboard` | Dashboard | Auth | Panel principal |
| `/contacts` | Contacts | User | Lista de contactos |
| `/conversations` | Conversations | User | Inbox de mensajes |
| `/calls` | Calls | User | Historial llamadas |
| `/campaigns` | Campaigns | User | Campanas |
| `/appointments` | Appointments | User | Citas |
| `/locations` | Locations | User | Sedes |
| `/settings` | Settings | Auth | Configuracion |
| `/admin/tenants` | Tenants | SuperAdmin | Gestion tenants |
| `/admin/users` | Users | SuperAdmin | Gestion usuarios |
| `/admin/integrations` | Integrations | SuperAdmin | Integraciones |
