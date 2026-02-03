# Frontend

Documentacion de la arquitectura y patrones del frontend.

## Contenido

1. [Component Patterns](./component-patterns.md) - Patrones de componentes
2. [Custom Hooks](./custom-hooks.md) - Hooks pattern (TIER S)
3. [Routing](./routing.md) - React Router y rutas protegidas
4. [Forms & Validation](./forms-validation.md) - React Hook Form + Zod
5. [Infinite Scroll](./infinite-scroll.md) - Paginacion infinita
6. [File Uploads](./file-uploads.md) - Manejo de archivos
7. [Styling Guide](./styling-guide.md) - Tailwind + shadcn-ui

## Stack Frontend

| Tecnologia | Uso |
|------------|-----|
| React 18 | UI Library |
| TypeScript | Type safety |
| Vite | Build tool |
| React Router 6 | Routing |
| React Query 5 | Server state |
| React Hook Form | Forms |
| Zod | Validation |
| Tailwind CSS | Styling |
| shadcn-ui | Components |
| Radix UI | Primitives |
| Lucide | Icons |
| Sonner | Toasts |

## Estructura de Carpetas

```
src/
├── components/           # Componentes compartidos
│   ├── ui/              # shadcn-ui components
│   └── layout/          # Layout components
├── features/            # Modulos por feature
│   ├── contacts/
│   ├── conversations/
│   ├── calls/
│   └── ...
├── hooks/               # Hooks globales
├── contexts/            # React Contexts
├── integrations/        # Supabase client + types
├── lib/                 # Utilidades
│   ├── utils.ts        # cn() y helpers
│   └── validations/    # Zod schemas
└── pages/              # Componentes de pagina
```

## Flujo de Datos

```
Page Component
    │
    ├── useFeatureData()     # Query hook
    ├── useFeatureMutations() # Mutation hook
    │
    └── Feature Components
            │
            └── service.ts → Supabase → Database
```

## Patrones Principales

### Feature Module

```
features/contacts/
├── components/
│   ├── ContactList.tsx
│   ├── ContactForm.tsx
│   └── ContactCard.tsx
├── hooks/
│   ├── useContacts.ts        # Query
│   └── useContactMutations.ts # Mutations
├── services/
│   └── contact.service.ts    # API calls
├── types/
│   └── index.ts              # Types
└── utils/
    └── helpers.ts            # Utilities
```

### Component Types

| Tipo | Ubicacion | Proposito |
|------|-----------|-----------|
| Page | `pages/` | Route entry point |
| Feature | `features/*/components/` | Domain-specific |
| Shared | `components/` | Reusable |
| UI | `components/ui/` | shadcn primitives |

### Hook Types

| Tipo | Nombre | Proposito |
|------|--------|-----------|
| Query | `useFeature` | Fetch data |
| Mutation | `useFeatureMutations` | CRUD operations |
| Filter | `useFeatureFilters` | Filter state |
| Global | `use-*.ts` | Shared logic |

## Quick Reference

### Crear Query Hook

```typescript
export function useContacts(filters: Filters, page: number) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['contacts', tenantId, filters, page],
    queryFn: () => contactService.getContacts(filters, page),
    enabled: !!tenantId,
  });
}
```

### Crear Mutation Hook

```typescript
export function useContactMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: contactService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Creado exitosamente');
    },
  });

  return { create };
}
```

### Crear Service

```typescript
export async function getContacts(filters: Filters, page: number) {
  const { data, count, error } = await supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filters.tenantId)
    .range((page - 1) * 50, page * 50 - 1);

  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}
```

### Usar en Componente

```typescript
function ContactsPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useContacts(filters, page);
  const { create } = useContactMutations();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <ContactList contacts={data.data} />
      <Button onClick={() => create.mutate(newContact)}>
        Crear
      </Button>
    </div>
  );
}
```

## Importaciones

Usar path alias `@/` para imports:

```typescript
// Correcto
import { Button } from '@/components/ui/button';
import { useContacts } from '@/features/contacts/hooks/useContacts';

// Evitar
import { Button } from '../../../components/ui/button';
```

## Siguiente Paso

Continua con [Component Patterns](./component-patterns.md) para ver patrones de componentes.
