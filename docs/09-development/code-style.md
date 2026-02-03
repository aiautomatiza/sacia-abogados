# Code Style Guide

Convenciones de código para el proyecto.

## TypeScript

### Naming

```typescript
// Variables y funciones: camelCase
const userName = 'John';
function getUserById(id: string) {}

// Tipos e interfaces: PascalCase
interface UserProfile {}
type ContactStatus = 'active' | 'inactive';

// Constantes: UPPER_SNAKE_CASE
const MAX_PAGE_SIZE = 50;
const API_BASE_URL = '/api';

// Archivos de componentes: PascalCase
// ContactCard.tsx, UserProfile.tsx

// Archivos de utilidades: kebab-case
// date-utils.ts, phone-helpers.ts

// Hooks: use prefix + PascalCase
// useContacts.ts, useAuth.ts
```

### Types vs Interfaces

```typescript
// Usar type para unions y primitivos
type Status = 'active' | 'inactive' | 'pending';
type ID = string | number;

// Usar interface para objetos y extensión
interface User {
  id: string;
  name: string;
}

interface AdminUser extends User {
  permissions: string[];
}
```

### Imports

```typescript
// 1. Librerías externas
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Imports internos absolutos (@/)
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// 3. Imports relativos
import { ContactCard } from './ContactCard';
import type { Contact } from '../types';

// Siempre usar 'type' para imports de solo tipos
import type { Database } from '@/integrations/supabase/types';
```

### Exports

```typescript
// Preferir named exports
export function useContacts() {}
export const ContactCard = () => {};

// Default export solo para páginas
export default function ContactsPage() {}

// Barrel exports en index.ts
// features/contacts/index.ts
export * from './components';
export * from './hooks';
export * from './types';
```

## React

### Componentes

```typescript
// Usar function components
function ContactCard({ contact, onSelect }: ContactCardProps) {
  return <div>...</div>;
}

// Props interface separada
interface ContactCardProps {
  contact: Contact;
  onSelect?: (contact: Contact) => void;
  className?: string;
}

// Destructuring de props
function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  // No: function UserAvatar(props: UserAvatarProps)
}
```

### Hooks

```typescript
// Orden de hooks
function MyComponent() {
  // 1. Context hooks
  const { tenantId } = useProfile();

  // 2. State hooks
  const [isOpen, setIsOpen] = useState(false);

  // 3. Query hooks
  const { data, isLoading } = useContacts();

  // 4. Mutation hooks
  const { create } = useContactMutations();

  // 5. Effect hooks
  useEffect(() => {}, []);

  // 6. Callbacks y memos
  const handleSubmit = useCallback(() => {}, []);
  const filteredData = useMemo(() => {}, [data]);

  // 7. Render
  return <div>...</div>;
}
```

### Event Handlers

```typescript
// Prefix con 'handle'
function ContactForm() {
  const handleSubmit = (data: FormData) => {};
  const handleCancel = () => {};
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {};

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} />
      <button onClick={handleCancel}>Cancel</button>
    </form>
  );
}
```

### Conditional Rendering

```typescript
// Early return para loading/error
function ContactsList() {
  const { data, isLoading, error } = useContacts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;

  return (
    <div>
      {data.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}

// Usar && para condicionales simples
{isAdmin && <AdminPanel />}

// Usar ternario para if/else
{isLoading ? <Spinner /> : <Content />}

// NO usar ternarios anidados
// ❌ {a ? (b ? <A /> : <B />) : <C />}
```

## Services

### Estructura

```typescript
// services/contacts.service.ts

// Constantes al inicio
const PAGE_SIZE = 50;

// Funciones exportadas
export async function getContacts(
  tenantId: string,
  filters: ContactFilters,
  page: number
): Promise<ContactsResponse> {
  // Construir query
  let query = supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Aplicar filtros
  if (filters.search) {
    query = query.ilike('nombre', `%${filters.search}%`);
  }

  // Ejecutar
  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}
```

### Error Handling

```typescript
// En services: throw errors
export async function createContact(data: ContactInsert) {
  const { data: created, error } = await supabase
    .from('crm_contacts')
    .insert(data)
    .select()
    .single();

  if (error) throw error; // Dejar que el hook maneje
  return created;
}

// En hooks: catch y notificar
const create = useMutation({
  mutationFn: contactService.createContact,
  onError: (error: Error) => {
    toast.error(error.message || 'Error al crear contacto');
  },
});
```

## CSS / Tailwind

### Orden de Clases

```tsx
// 1. Layout (display, position, flex/grid)
// 2. Spacing (margin, padding)
// 3. Sizing (width, height)
// 4. Typography
// 5. Visual (colors, borders)
// 6. States (hover, focus)
// 7. Responsive

<div className="
  flex flex-col items-center
  p-4 gap-2
  w-full max-w-md
  text-sm font-medium
  bg-white border rounded-lg shadow-sm
  hover:shadow-md
  md:flex-row md:p-6
">
```

### Utility cn()

```typescript
import { cn } from '@/lib/utils';

// Combinar clases condicionalmente
<div className={cn(
  'p-4 rounded-lg',
  isActive && 'bg-primary text-primary-foreground',
  isDisabled && 'opacity-50 pointer-events-none',
  className // Permitir override externo
)} />
```

### Component Variants

```typescript
// Usar cva para variantes
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

## Comentarios

```typescript
// Comentarios útiles:
// - Explicar el "por qué", no el "qué"
// - TODO con contexto
// - Documentar workarounds

// ❌ Mal
// Incrementa el contador
count++;

// ✅ Bien
// Incrementamos antes del render para evitar flash de contenido anterior
count++;

// ✅ TODO con contexto
// TODO: Remover después de migración a nuevo API (ticket #123)

// ✅ Workaround documentado
// WORKAROUND: Supabase no soporta filtros OR en realtime,
// usamos filter string manual
filter: `tenant_id=eq.${tenantId}`,
```

## Git Commits

### Formato

```
type(scope): descripción corta

- Detalle 1
- Detalle 2

Closes #123
```

### Types

| Type | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Bug fix |
| `refactor` | Refactoring sin cambio de comportamiento |
| `style` | Formateo, espacios, etc. |
| `docs` | Documentación |
| `test` | Tests |
| `chore` | Tareas de mantenimiento |
| `perf` | Mejoras de performance |

### Ejemplos

```
feat(contacts): add bulk delete functionality

- Add multi-select to contacts list
- Implement bulk delete mutation
- Add confirmation dialog

Closes #45

---

fix(realtime): resolve messages not appearing without reload

- Add retry logic for TIMED_OUT errors
- Reduce connection timeout from 10s to 5s

---

refactor(hooks): extract common query patterns to shared utilities
```

## Linting

### ESLint Rules

El proyecto usa ESLint con reglas estándar de React/TypeScript.

```bash
# Verificar
npm run lint

# Fix automático
npm run lint -- --fix
```

### Reglas Principales

- No `any` implícito
- No variables sin usar
- Hooks en orden correcto
- Dependencias de useEffect completas
- Imports ordenados
