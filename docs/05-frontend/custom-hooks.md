# Custom Hooks

Patrones de hooks para manejo de datos (TIER S pattern).

## Filosofia

Los hooks encapsulan toda la logica de datos:
- **useX** - Query hooks (lectura)
- **useXMutations** - Mutation hooks (escritura)
- Componentes solo consumen datos y renderizan

## Patron Query Hook

### Estructura Basica

```typescript
// src/features/contacts/hooks/useContacts.ts
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/use-profile';
import * as contactService from '../services/contact.service';
import type { ContactFilters } from '../types';

export function useContacts(filters: ContactFilters, page: number = 1) {
  const { tenantId } = useProfile();

  return useQuery({
    // Query key incluye todas las dependencias
    queryKey: ['contacts', tenantId, filters, page],

    // Funcion que fetches los datos
    queryFn: () => contactService.getContacts(
      { ...filters, tenantId: tenantId! },
      page
    ),

    // Solo ejecutar si tenemos tenant
    enabled: !!tenantId,

    // Tiempo antes de considerar datos stale
    staleTime: 30 * 1000, // 30 segundos

    // Mantener datos previos mientras carga nuevos
    placeholderData: (previousData) => previousData,
  });
}
```

### Con Opciones Configurables

```typescript
interface UseContactsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useContacts(
  filters: ContactFilters,
  page: number = 1,
  options: UseContactsOptions = {}
) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['contacts', tenantId, filters, page],
    queryFn: () => contactService.getContacts({ ...filters, tenantId: tenantId! }, page),
    enabled: !!tenantId && (options.enabled ?? true),
    staleTime: 30 * 1000,
    refetchInterval: options.refetchInterval,
  });
}
```

### Query Hook para Item Individual

```typescript
export function useContact(contactId: string | undefined) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactService.getContactById(contactId!),
    enabled: !!contactId && !!tenantId,
  });
}
```

## Patron Mutation Hook

### Estructura Basica

```typescript
// src/features/contacts/hooks/useContactMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import * as contactService from '../services/contact.service';
import type { ContactInsert, ContactUpdate } from '../types';

export function useContactMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  // CREATE
  const createContact = useMutation({
    mutationFn: (data: ContactInsert) =>
      contactService.createContact({ ...data, tenant_id: tenantId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear contacto');
    },
  });

  // UPDATE
  const updateContact = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) =>
      contactService.updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  // DELETE
  const deleteContact = useMutation({
    mutationFn: (id: string) => contactService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

  // BULK DELETE
  const deleteContacts = useMutation({
    mutationFn: (ids: string[]) => contactService.deleteContacts(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success(`${ids.length} contactos eliminados`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

  return {
    createContact,
    updateContact,
    deleteContact,
    deleteContacts,
  };
}
```

### Con Optimistic Updates

```typescript
const updateContact = useMutation({
  mutationFn: ({ id, data }) => contactService.updateContact(id, data),

  onMutate: async ({ id, data }) => {
    // Cancelar queries en progreso
    await queryClient.cancelQueries({ queryKey: ['contacts', tenantId] });

    // Guardar estado previo
    const previousContacts = queryClient.getQueryData(['contacts', tenantId]);

    // Actualizar optimisticamente
    queryClient.setQueryData(['contacts', tenantId], (old: any) => ({
      ...old,
      data: old.data.map((c: Contact) =>
        c.id === id ? { ...c, ...data } : c
      ),
    }));

    return { previousContacts };
  },

  onError: (err, variables, context) => {
    // Rollback en error
    if (context?.previousContacts) {
      queryClient.setQueryData(['contacts', tenantId], context.previousContacts);
    }
    toast.error('Error al actualizar');
  },

  onSettled: () => {
    // Siempre refetch para sincronizar
    queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
  },
});
```

## Patron Infinite Query

```typescript
// src/features/conversations/hooks/useInfiniteConversations.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteConversations(filters: ConversationFilters) {
  const { tenantId } = useProfile();

  return useInfiniteQuery({
    queryKey: ['conversations', 'infinite', tenantId, filters],

    queryFn: ({ pageParam = 1 }) =>
      conversationService.getConversations(
        { ...filters, tenantId: tenantId! },
        pageParam
      ),

    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },

    enabled: !!tenantId,
    staleTime: 0, // Siempre fresco para mensajes
  });
}

// Uso en componente
function ConversationList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteConversations(filters);

  // Aplanar paginas en un array
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

## Hooks Globales

### useProfile

```typescript
// src/hooks/use-profile.ts
export function useProfile() {
  const { user, scope } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
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
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    profile,
    tenantId: scope?.tenantId,
    tenant: profile?.tenants,
    isLoading,
    error,
  };
}
```

### useRole

```typescript
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

### useDebounce

```typescript
// src/hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Uso
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

const { data } = useContacts({ search: debouncedSearch }, page);
```

### useRealtime

```typescript
// src/hooks/use-realtime.ts
export function useRealtime({ subscriptions, debounceMs = 1000, enabled = true }) {
  const queryClient = useQueryClient();
  // ... implementacion en docs/02-architecture/realtime.md
}
```

## Composicion de Hooks

### Hook de Feature Completo

```typescript
// src/features/contacts/hooks/useContactsFeature.ts
export function useContactsFeature() {
  const [filters, setFilters] = useState<ContactFilters>({});
  const [page, setPage] = useState(1);
  const { tenantId } = useProfile();

  // Debounce search
  const debouncedFilters = useDebounce(filters, 300);

  // Query data
  const query = useContacts(debouncedFilters, page);

  // Mutations
  const mutations = useContactMutations();

  // Realtime
  useRealtime({
    subscriptions: [{
      table: 'crm_contacts',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['contacts', tenantId]],
    }],
    enabled: !!tenantId,
  });

  return {
    // Data
    contacts: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,

    // Pagination
    page,
    setPage,
    totalPages: Math.ceil((query.data?.total ?? 0) / 50),

    // Filters
    filters,
    setFilters,
    updateFilter: <K extends keyof ContactFilters>(
      key: K,
      value: ContactFilters[K]
    ) => setFilters(prev => ({ ...prev, [key]: value })),

    // Mutations
    ...mutations,
  };
}
```

### Uso en Page Component

```typescript
function ContactsPage() {
  const {
    contacts,
    isLoading,
    page,
    setPage,
    totalPages,
    filters,
    updateFilter,
    createContact,
    deleteContacts,
  } = useContactsFeature();

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <SearchInput
        value={filters.search ?? ''}
        onChange={(v) => updateFilter('search', v)}
      />

      <ContactList
        contacts={contacts}
        onDelete={(ids) => deleteContacts.mutate(ids)}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
      />

      <CreateContactDialog
        onCreate={(data) => createContact.mutate(data)}
      />
    </div>
  );
}
```

## Buenas Practicas

1. **Query keys jerarquicas** - Incluir todas las dependencias
2. **Enabled condicional** - No ejecutar queries sin datos necesarios
3. **Invalidacion especifica** - Invalidar solo queries afectadas
4. **Toast en mutations** - Feedback al usuario
5. **Error handling** - Siempre manejar errores
6. **Separar queries de mutations** - En hooks diferentes
