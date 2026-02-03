# State Management

Como se maneja el estado en la aplicacion usando React Query y Context.

## Tipos de Estado

| Tipo | Herramienta | Ejemplo |
|------|-------------|---------|
| **Server State** | React Query | Contactos, conversaciones, llamadas |
| **Auth State** | React Context | Usuario, sesion, rol |
| **UI State** | useState/useReducer | Modales, filtros, paginacion |
| **URL State** | React Router | Pagina actual, query params |

## Server State con React Query

### Configuracion Global

```typescript
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 segundos
      gcTime: 5 * 60 * 1000,     // 5 minutos (antes cacheTime)
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

### Patron de Query Hooks

```typescript
// src/features/contacts/hooks/useContacts.ts
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/use-profile';
import { getContacts } from '../services/contact.service';

interface ContactFilters {
  search?: string;
  status?: string;
}

export function useContacts(filters: ContactFilters, page: number) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['contacts', tenantId, filters, page],
    queryFn: () => getContacts({ ...filters, tenantId }, page),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData, // keepPreviousData
  });
}
```

### Patron de Mutation Hooks

```typescript
// src/features/contacts/hooks/useContactMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import * as contactService from '../services/contact.service';

export function useContactMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  const createContact = useMutation({
    mutationFn: contactService.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear contacto');
    },
  });

  const updateContact = useMutation({
    mutationFn: contactService.updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const deleteContact = useMutation({
    mutationFn: contactService.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

  return {
    createContact,
    updateContact,
    deleteContact,
  };
}
```

### Infinite Queries (Scroll Infinito)

```typescript
// src/features/conversations/hooks/useInfiniteConversations.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteConversations(filters: ConversationFilters) {
  const { tenantId } = useProfile();

  return useInfiniteQuery({
    queryKey: ['conversations', 'infinite', tenantId, filters],
    queryFn: ({ pageParam = 1 }) =>
      conversationService.getConversations(filters, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!tenantId,
  });
}

// Uso en componente
function ConversationList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteConversations(filters);

  // Aplanar paginas
  const conversations = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <div>
      {conversations.map(conv => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Cargando...' : 'Cargar mas'}
        </Button>
      )}
    </div>
  );
}
```

## Auth State con Context

### AuthContext

```typescript
// src/contexts/auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthScope {
  userId: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  scope: AuthScope | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [scope, setScope] = useState<AuthScope | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesion inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchScope(session.user.id);
      }
      setLoading(false);
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchScope(session.user.id);
        } else {
          setScope(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchScope(userId: string) {
    // Obtener perfil y rol
    const [profileResult, roleResult] = await Promise.all([
      supabase.from('profiles').select('tenant_id').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);

    setScope({
      userId,
      tenantId: profileResult.data?.tenant_id ?? null,
      isSuperAdmin: roleResult.data?.role === 'super_admin',
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setScope(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        scope,
        isAuthenticated: !!user,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Hooks Derivados

```typescript
// src/hooks/use-profile.ts
export function useProfile() {
  const { user, scope } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return {
    profile,
    tenantId: scope?.tenantId,
    tenant: profile?.tenants,
    isLoading,
  };
}

// src/hooks/use-role.ts
export function useRole() {
  const { scope, loading } = useAuth();

  return {
    role: scope?.isSuperAdmin ? 'super_admin' : 'user_client',
    isLoading: loading,
    isSuperAdmin: scope?.isSuperAdmin ?? false,
    isUserClient: !scope?.isSuperAdmin,
  };
}
```

## UI State

### Estado Local con useState

```typescript
function ContactsPage() {
  // Filtros locales
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Paginacion local
  const [page, setPage] = useState(1);

  // Debounce para busqueda
  const debouncedSearch = useDebounce(search, 300);

  // Query con filtros
  const { data } = useContacts(
    { search: debouncedSearch, status: statusFilter },
    page
  );

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar..."
      />
      {/* ... */}
    </div>
  );
}
```

### Custom Hook para Filtros

```typescript
// src/features/contacts/hooks/useContactFilters.ts
export function useContactFilters() {
  const [filters, setFilters] = useState<ContactFilters>({
    search: '',
    status: undefined,
  });

  const updateFilter = useCallback(
    <K extends keyof ContactFilters>(key: K, value: ContactFilters[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ search: '', status: undefined });
  }, []);

  return {
    filters,
    updateFilter,
    resetFilters,
  };
}
```

## URL State con React Router

```typescript
// Leer/escribir estado en URL
import { useSearchParams } from 'react-router-dom';

function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer de URL
  const conversationId = searchParams.get('conversationId');
  const channel = searchParams.get('channel') || 'all';

  // Escribir a URL
  const selectConversation = (id: string) => {
    setSearchParams(prev => {
      prev.set('conversationId', id);
      return prev;
    });
  };

  return (
    <div>
      <ConversationList onSelect={selectConversation} />
      {conversationId && (
        <ConversationDetail id={conversationId} />
      )}
    </div>
  );
}
```

## Patrones de Invalidacion

### Invalidacion por Evento

```typescript
// Despues de crear contacto, invalidar lista
const createContact = useMutation({
  mutationFn: contactService.createContact,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  },
});
```

### Invalidacion Selectiva

```typescript
// Invalidar solo queries de un tenant especifico
queryClient.invalidateQueries({
  queryKey: ['contacts', tenantId],
});

// Invalidar queries que empiecen con 'contacts'
queryClient.invalidateQueries({
  queryKey: ['contacts'],
  exact: false,
});
```

### Invalidacion por Realtime

```typescript
// Ver docs/02-architecture/realtime.md
useRealtime({
  subscriptions: [{
    table: 'crm_contacts',
    queryKeysToInvalidate: [['contacts', tenantId]],
  }],
});
```

## Optimistic Updates

```typescript
const updateContact = useMutation({
  mutationFn: contactService.updateContact,
  onMutate: async (newContact) => {
    // Cancelar queries en progreso
    await queryClient.cancelQueries({ queryKey: ['contacts'] });

    // Snapshot del estado anterior
    const previousContacts = queryClient.getQueryData(['contacts']);

    // Optimistically update
    queryClient.setQueryData(['contacts'], (old: Contact[]) =>
      old.map(c => c.id === newContact.id ? newContact : c)
    );

    // Retornar contexto con snapshot
    return { previousContacts };
  },
  onError: (err, newContact, context) => {
    // Rollback en caso de error
    queryClient.setQueryData(['contacts'], context?.previousContacts);
  },
  onSettled: () => {
    // Refetch para asegurar sincronizacion
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  },
});
```

## DevTools

```typescript
// En desarrollo, habilitar React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Siguiente Paso

Continua con [Realtime](./realtime.md) para ver como se manejan las actualizaciones en tiempo real.
