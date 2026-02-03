# Features

Documentacion de cada feature/modulo del sistema.

## Features Disponibles

| Feature | Descripcion | Documento |
|---------|-------------|-----------|
| Admin | Gestion de tenants y usuarios | [admin.md](./admin.md) |
| Contacts | CRM con campos personalizados | [contacts.md](./contacts.md) |
| Conversations | Mensajeria multi-canal | [conversations.md](./conversations.md) |
| Calls | Seguimiento de llamadas | [calls.md](./calls.md) |
| Campaigns | Campanas broadcast | [campaigns.md](./campaigns.md) |
| Appointments | Sistema de citas | [appointments.md](./appointments.md) |
| Locations | Sedes fisicas | [locations.md](./locations.md) |
| Integrations | OAuth y sincronizacion | [integrations.md](./integrations.md) |

## Estructura de una Feature

```
src/features/{feature-name}/
├── components/           # Componentes de UI
│   ├── FeatureList.tsx
│   ├── FeatureForm.tsx
│   ├── FeatureCard.tsx
│   └── FeatureDetail.tsx
├── hooks/               # Hooks de datos
│   ├── useFeature.ts    # Query principal
│   └── useFeatureMutations.ts
├── services/            # Capa de servicio
│   └── feature.service.ts
├── types/               # TypeScript types
│   └── index.ts
├── utils/               # Utilidades
│   └── helpers.ts
└── README.md            # Documentacion (opcional)
```

## Patron de Implementacion

### 1. Types

```typescript
// src/features/contacts/types/index.ts
import type { Database } from '@/integrations/supabase/types';

export type Contact = Database['public']['Tables']['crm_contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['crm_contacts']['Insert'];
export type ContactUpdate = Database['public']['Tables']['crm_contacts']['Update'];

export interface ContactFilters {
  search?: string;
  status?: string;
  tenantId: string;
}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 2. Service

```typescript
// src/features/contacts/services/contact.service.ts
import { supabase } from '@/integrations/supabase/client';
import type { ContactFilters, ContactsResponse } from '../types';

const PAGE_SIZE = 50;

export async function getContacts(
  filters: ContactFilters,
  page: number
): Promise<ContactsResponse> {
  let query = supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filters.tenantId);

  if (filters.search) {
    query = query.or(
      `numero.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);
  query = query.order('created_at', { ascending: false });

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

export async function createContact(data: ContactInsert) {
  const { data: contact, error } = await supabase
    .from('crm_contacts')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return contact;
}

// ... mas operaciones
```

### 3. Hooks

```typescript
// src/features/contacts/hooks/useContacts.ts
export function useContacts(filters: Omit<ContactFilters, 'tenantId'>, page: number) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['contacts', tenantId, filters, page],
    queryFn: () => contactService.getContacts({ ...filters, tenantId: tenantId! }, page),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
}

// src/features/contacts/hooks/useContactMutations.ts
export function useContactMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  const createContact = useMutation({
    mutationFn: contactService.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantId] });
      toast.success('Contacto creado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { createContact };
}
```

### 4. Componentes

```typescript
// src/features/contacts/components/ContactList.tsx
interface ContactListProps {
  contacts: Contact[];
  onSelect?: (contact: Contact) => void;
}

export function ContactList({ contacts, onSelect }: ContactListProps) {
  return (
    <div className="space-y-2">
      {contacts.map(contact => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onClick={() => onSelect?.(contact)}
        />
      ))}
    </div>
  );
}
```

### 5. Page

```typescript
// src/pages/Contacts.tsx
export default function ContactsPage() {
  const [filters, setFilters] = useState<ContactFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useContacts(filters, page);
  const { createContact } = useContactMutations();

  // Realtime
  useRealtime({
    subscriptions: [{
      table: 'crm_contacts',
      queryKeysToInvalidate: [['contacts']],
    }],
  });

  return (
    <PageLayout title="Contactos">
      <ContactFilters value={filters} onChange={setFilters} />
      {isLoading ? (
        <ContactListSkeleton />
      ) : (
        <ContactList contacts={data?.data ?? []} />
      )}
      <Pagination page={page} total={data?.totalPages ?? 0} onChange={setPage} />
    </PageLayout>
  );
}
```

## Template para Nueva Feature

Ver [_template.md](./_template.md) para crear documentacion de nuevas features.

## Resumen de Features

### Admin

- CRUD de tenants (super_admin)
- Gestion de usuarios
- Invitaciones
- Configuracion global

### Contacts

- CRUD de contactos
- Campos personalizados
- Busqueda y filtros
- Import/export

### Conversations

- Inbox multi-canal
- Mensajes en tiempo real
- Archivos adjuntos
- Templates WhatsApp

### Calls

- Historial de llamadas
- Reproductor de audio
- Transcripciones
- Estadisticas

### Campaigns

- Campanas broadcast
- Cola de mensajes
- Progreso en tiempo real
- WhatsApp y llamadas

### Appointments

- Citas telefonicas
- Citas presenciales
- Disponibilidad
- Calendario

### Locations

- Sedes fisicas
- Horarios
- Geolocalizacion

### Integrations

- OAuth flow
- Sincronizacion
- Pipedrive, Zoho, etc.
