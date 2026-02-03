# Data Flow

Como fluyen los datos desde el componente hasta la base de datos y de vuelta.

## Diagrama Principal

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              COMPONENTE                                   │
│                         (ej: ContactList.tsx)                            │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ useContacts()
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            CUSTOM HOOK                                    │
│                        (ej: useContacts.ts)                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  useQuery({                                                         │ │
│  │    queryKey: ['contacts', tenantId, filters, page],                │ │
│  │    queryFn: () => contactService.getContacts(...),                 │ │
│  │  })                                                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ contactService.getContacts()
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                    │
│                     (ej: contact.service.ts)                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  export async function getContacts(filters, page) {                 │ │
│  │    const { data, count } = await supabase                          │ │
│  │      .from('crm_contacts')                                         │ │
│  │      .select('*', { count: 'exact' })                              │ │
│  │      .eq('tenant_id', filters.tenantId)                            │ │
│  │      .range(from, to);                                              │ │
│  │    return { data, total: count };                                   │ │
│  │  }                                                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ supabase.from().select()
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE CLIENT                                   │
│                   (src/integrations/supabase/client.ts)                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  - Construye query SQL                                              │ │
│  │  - Agrega auth token (JWT)                                          │ │
│  │  - Envia request a PostgREST                                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ HTTP Request
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                        │
│                    (PostgreSQL + RLS)                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  1. PostgREST recibe request                                        │ │
│  │  2. Extrae user del JWT                                             │ │
│  │  3. Aplica RLS policies                                             │ │
│  │  4. Ejecuta query                                                   │ │
│  │  5. Retorna resultado                                               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ JSON Response
                                  ▼
                    ┌─────────────────────────────┐
                    │       REACT QUERY           │
                    │         CACHE               │
                    │  ['contacts', tenantId, ...]│
                    └─────────────┬───────────────┘
                                  │
                                  │ Cached data
                                  ▼
                    ┌─────────────────────────────┐
                    │        COMPONENTE           │
                    │    Re-render con data       │
                    └─────────────────────────────┘
```

## Ejemplo Completo: Leer Contactos

### 1. Componente

```typescript
// src/features/contacts/components/ContactList.tsx
function ContactList() {
  const [filters, setFilters] = useState<ContactFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useContacts(filters, page);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <Table>
      {data?.contacts.map(contact => (
        <ContactRow key={contact.id} contact={contact} />
      ))}
    </Table>
  );
}
```

### 2. Custom Hook

```typescript
// src/features/contacts/hooks/useContacts.ts
export function useContacts(filters: ContactFilters, page: number) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['contacts', tenantId, filters, page],
    queryFn: () => contactService.getContacts({ ...filters, tenantId }, page),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 segundos
  });
}
```

### 3. Service Layer

```typescript
// src/features/contacts/services/contact.service.ts
const PAGE_SIZE = 50;

export async function getContacts(
  filters: ContactFilters & { tenantId: string },
  page: number
) {
  let query = supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filters.tenantId);

  // Aplicar filtros
  if (filters.search) {
    query = query.or(
      `numero.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`
    );
  }

  // Paginacion
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  // Ordenamiento
  query = query.order('created_at', { ascending: false });

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    contacts: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}
```

## Flujo de Mutations (Escritura)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              COMPONENTE                                   │
│                      onClick={() => createContact(data)}                 │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ mutation.mutate(data)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          MUTATION HOOK                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  useMutation({                                                      │ │
│  │    mutationFn: (data) => contactService.createContact(data),       │ │
│  │    onSuccess: () => {                                               │ │
│  │      queryClient.invalidateQueries(['contacts']);                  │ │
│  │      toast.success('Contacto creado');                             │ │
│  │    },                                                               │ │
│  │  })                                                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ Service call
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  await supabase                                                     │ │
│  │    .from('crm_contacts')                                           │ │
│  │    .insert({ ...data, tenant_id: tenantId })                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ INSERT
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  1. RLS verifica permisos                                           │ │
│  │  2. INSERT en crm_contacts                                          │ │
│  │  3. Trigger de Realtime                                             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  │ Success
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       MUTATION onSuccess                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  1. invalidateQueries(['contacts']) - Refetch                       │ │
│  │  2. toast.success() - Notificacion                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

## Flujo con Realtime Updates

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              OTRO USUARIO                                │
│                    (o Edge Function, o API externa)                     │
│                                                                         │
│                    INSERT INTO crm_contacts (...)                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                       │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Trigger Realtime envia evento:                                    │ │
│  │  {                                                                 │ │
│  │    table: 'crm_contacts',                                          │ │
│  │    eventType: 'INSERT',                                            │ │
│  │    new: { id: 'xxx', nombre: 'Juan', ... }                         │ │
│  │  }                                                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE REALTIME                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Filtra por tenant_id (si hay filtro configurado)                  │ │
│  │  Envia a clientes suscritos                                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ Mensaje WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         useRealtime HOOK                                 │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  1. Recibe el evento                                               │ │
│  │  2. Debounce (1000ms default)                                      │ │
│  │  3. queryClient.invalidateQueries(['contacts', tenantId])          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ Invalidacion
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REACT QUERY                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  1. Marca query como stale                                         │ │
│  │  2. Refetch automatico                                             │ │
│  │  3. Actualiza cache                                                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ Nuevo data
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           COMPONENTE                                     │
│                     Re-render automatico                                │
│                    Usuario ve nuevo contacto                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Query Key Structure

Las query keys siguen un patron jerarquico para cache management:

```typescript
// Estructura general
['feature', tenantId, filters, page, sort]

// Ejemplos
['contacts', 'tenant-123']
['contacts', 'tenant-123', { search: 'juan' }]
['contacts', 'tenant-123', { search: 'juan' }, 1]

// Conversations (infinite query)
['conversations', 'infinite', 'tenant-123', filters]

// Calls con stats
['calls', 'tenant-123', filters, page, sort]
['calls-stats', 'tenant-123', filters]
```

## Invalidacion de Cache

```typescript
// Invalidar todas las queries de contacts
queryClient.invalidateQueries({ queryKey: ['contacts'] });

// Invalidar solo para un tenant
queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });

// Invalidar queries especificas
queryClient.invalidateQueries({
  queryKey: ['contacts', tenantId, filters],
});
```

## Stale Time por Feature

| Feature | Stale Time | Razon |
|---------|------------|-------|
| Contacts | 30s | Datos relativamente estaticos |
| Conversations | 0s | Necesita datos frescos |
| Calls | 60s | Historial, raramente cambia |
| Campaigns | 30s | Cambios moderados |

## Siguiente Paso

Continua con [State Management](./state-management.md) para profundizar en React Query y Context.
