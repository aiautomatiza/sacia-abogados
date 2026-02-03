# Component Patterns

Patrones de componentes usados en el proyecto.

## Tipos de Componentes

### 1. Page Components

Componentes que representan una ruta completa.

```typescript
// src/pages/Contacts.tsx
import { useContactsFeature } from '@/features/contacts/hooks/useContactsFeature';
import { ContactList } from '@/features/contacts/components/ContactList';
import { ContactFilters } from '@/features/contacts/components/ContactFilters';
import { PageLayout } from '@/components/layout/PageLayout';

export default function ContactsPage() {
  const {
    contacts,
    isLoading,
    error,
    filters,
    updateFilter,
    page,
    setPage,
    totalPages,
  } = useContactsFeature();

  if (error) {
    return <ErrorState message={error.message} />;
  }

  return (
    <PageLayout title="Contactos">
      <ContactFilters
        filters={filters}
        onChange={updateFilter}
      />

      {isLoading ? (
        <ContactListSkeleton />
      ) : (
        <ContactList contacts={contacts} />
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
      />
    </PageLayout>
  );
}
```

**Responsabilidades:**
- Orquestar feature hooks
- Layout de pagina
- Loading/error states

### 2. Feature Components

Componentes especificos de un dominio de negocio.

```typescript
// src/features/contacts/components/ContactList.tsx
interface ContactListProps {
  contacts: Contact[];
  onSelect?: (contact: Contact) => void;
  onDelete?: (ids: string[]) => void;
}

export function ContactList({ contacts, onSelect, onDelete }: ContactListProps) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="space-y-2">
      {contacts.length === 0 ? (
        <EmptyState message="No hay contactos" />
      ) : (
        contacts.map(contact => (
          <ContactCard
            key={contact.id}
            contact={contact}
            isSelected={selected.includes(contact.id)}
            onSelect={() => onSelect?.(contact)}
            onToggleSelect={(checked) => {
              setSelected(prev =>
                checked
                  ? [...prev, contact.id]
                  : prev.filter(id => id !== contact.id)
              );
            }}
          />
        ))
      )}

      {selected.length > 0 && (
        <BulkActions
          count={selected.length}
          onDelete={() => onDelete?.(selected)}
          onClear={() => setSelected([])}
        />
      )}
    </div>
  );
}
```

**Responsabilidades:**
- Logica de dominio
- Interaccion con datos de la feature
- Composicion de componentes menores

### 3. UI Components (shadcn-ui)

Componentes primitivos reutilizables.

```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### 4. Layout Components

Componentes de estructura de pagina.

```typescript
// src/components/layout/PageLayout.tsx
interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({
  title,
  description,
  actions,
  children,
}: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
```

## Patrones de Composicion

### Compound Components

```typescript
// Card con subcomponentes
export function ContactCard({ contact, children }: Props) {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>{contact.nombre}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

ContactCard.Actions = function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 mt-4">{children}</div>;
};

ContactCard.Badge = function Badge({ status }: { status: string }) {
  return <span className={cn('badge', statusColors[status])}>{status}</span>;
};

// Uso
<ContactCard contact={contact}>
  <p>{contact.numero}</p>
  <ContactCard.Badge status={contact.status} />
  <ContactCard.Actions>
    <Button>Editar</Button>
    <Button variant="destructive">Eliminar</Button>
  </ContactCard.Actions>
</ContactCard>
```

### Render Props

```typescript
interface DataListProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: (item: T) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
}

export function DataList<T>({
  data,
  isLoading,
  renderItem,
  renderEmpty = () => <EmptyState />,
  renderLoading = () => <Skeleton />,
}: DataListProps<T>) {
  if (isLoading) return renderLoading();
  if (data.length === 0) return renderEmpty();

  return <div>{data.map(renderItem)}</div>;
}

// Uso
<DataList
  data={contacts}
  isLoading={isLoading}
  renderItem={(contact) => (
    <ContactCard key={contact.id} contact={contact} />
  )}
/>
```

### Higher-Order Components (HOC)

```typescript
// Wrapper para proteger componentes
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return <FullPageSpinner />;
    if (!isAuthenticated) return <Navigate to="/auth" />;

    return <Component {...props} />;
  };
}

// Uso
const ProtectedDashboard = withAuth(Dashboard);
```

## Patrones de Estado

### Controlled Components

```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: InputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar..."
    />
  );
}

// Uso - el padre controla el estado
function Parent() {
  const [search, setSearch] = useState('');
  return <SearchInput value={search} onChange={setSearch} />;
}
```

### Uncontrolled Components

```typescript
interface FormProps {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
}

export function ContactForm({ defaultValues, onSubmit }: FormProps) {
  const form = useForm<FormData>({
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('nombre')} />
      <Button type="submit">Guardar</Button>
    </form>
  );
}
```

## Manejo de Loading States

```typescript
function ContactsPage() {
  const { data, isLoading, isFetching } = useContacts(filters, page);

  return (
    <div>
      {/* Skeleton en carga inicial */}
      {isLoading && <ContactListSkeleton />}

      {/* Datos con indicador de refetch */}
      {!isLoading && (
        <div className="relative">
          {isFetching && (
            <div className="absolute top-0 right-0">
              <Spinner size="sm" />
            </div>
          )}
          <ContactList contacts={data?.data ?? []} />
        </div>
      )}
    </div>
  );
}
```

## Manejo de Errores

```typescript
function ContactsPage() {
  const { data, error, refetch } = useContacts(filters, page);

  if (error) {
    return (
      <ErrorState
        title="Error al cargar contactos"
        message={error.message}
        action={
          <Button onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  // ...
}
```

## Convencion de Archivos

```
ContactList.tsx          # Componente principal
ContactList.skeleton.tsx # Skeleton loader
ContactList.test.tsx     # Tests
```

O todo en uno:

```typescript
// ContactList.tsx
export function ContactList({ ... }) { ... }

export function ContactListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
```
