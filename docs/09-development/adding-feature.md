# Adding a New Feature

Guia paso a paso para crear una nueva feature.

## Checklist

- [ ] Crear estructura de carpetas
- [ ] Definir tipos
- [ ] Crear servicio
- [ ] Crear hooks
- [ ] Crear componentes
- [ ] Crear pagina
- [ ] Agregar ruta
- [ ] Agregar realtime (si aplica)
- [ ] Actualizar documentacion

## Paso 1: Crear Estructura

```bash
mkdir -p src/features/nueva-feature/{components,hooks,services,types,utils}
```

Estructura resultante:

```
src/features/nueva-feature/
├── components/
│   ├── NuevaFeatureList.tsx
│   ├── NuevaFeatureForm.tsx
│   └── NuevaFeatureCard.tsx
├── hooks/
│   ├── useNuevaFeature.ts
│   └── useNuevaFeatureMutations.ts
├── services/
│   └── nueva-feature.service.ts
├── types/
│   └── index.ts
└── utils/
    └── helpers.ts
```

## Paso 2: Definir Tipos

```typescript
// src/features/nueva-feature/types/index.ts
import type { Database } from '@/integrations/supabase/types';

// Tipos de la tabla
export type NuevaFeature = Database['public']['Tables']['nueva_feature']['Row'];
export type NuevaFeatureInsert = Database['public']['Tables']['nueva_feature']['Insert'];
export type NuevaFeatureUpdate = Database['public']['Tables']['nueva_feature']['Update'];

// Filtros
export interface NuevaFeatureFilters {
  search?: string;
  status?: string;
  tenantId: string;
}

// Response
export interface NuevaFeatureResponse {
  data: NuevaFeature[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## Paso 3: Crear Servicio

```typescript
// src/features/nueva-feature/services/nueva-feature.service.ts
import { supabase } from '@/integrations/supabase/client';
import type {
  NuevaFeature,
  NuevaFeatureInsert,
  NuevaFeatureUpdate,
  NuevaFeatureFilters,
  NuevaFeatureResponse,
} from '../types';

const PAGE_SIZE = 50;

export async function getNuevaFeatureList(
  filters: NuevaFeatureFilters,
  page: number
): Promise<NuevaFeatureResponse> {
  let query = supabase
    .from('nueva_feature')
    .select('*', { count: 'exact' })
    .eq('tenant_id', filters.tenantId);

  // Filtros
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Paginacion
  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  // Orden
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

export async function getNuevaFeatureById(id: string): Promise<NuevaFeature> {
  const { data, error } = await supabase
    .from('nueva_feature')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createNuevaFeature(
  data: NuevaFeatureInsert
): Promise<NuevaFeature> {
  const { data: created, error } = await supabase
    .from('nueva_feature')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function updateNuevaFeature(
  id: string,
  data: NuevaFeatureUpdate
): Promise<NuevaFeature> {
  const { data: updated, error } = await supabase
    .from('nueva_feature')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteNuevaFeature(id: string): Promise<void> {
  const { error } = await supabase
    .from('nueva_feature')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

## Paso 4: Crear Hooks

### Query Hook

```typescript
// src/features/nueva-feature/hooks/useNuevaFeature.ts
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/use-profile';
import * as service from '../services/nueva-feature.service';
import type { NuevaFeatureFilters } from '../types';

export function useNuevaFeatureList(
  filters: Omit<NuevaFeatureFilters, 'tenantId'>,
  page: number = 1
) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['nueva-feature', tenantId, filters, page],
    queryFn: () =>
      service.getNuevaFeatureList({ ...filters, tenantId: tenantId! }, page),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useNuevaFeature(id: string | undefined) {
  return useQuery({
    queryKey: ['nueva-feature', id],
    queryFn: () => service.getNuevaFeatureById(id!),
    enabled: !!id,
  });
}
```

### Mutation Hook

```typescript
// src/features/nueva-feature/hooks/useNuevaFeatureMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import * as service from '../services/nueva-feature.service';
import type { NuevaFeatureInsert, NuevaFeatureUpdate } from '../types';

export function useNuevaFeatureMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  const create = useMutation({
    mutationFn: (data: Omit<NuevaFeatureInsert, 'tenant_id'>) =>
      service.createNuevaFeature({ ...data, tenant_id: tenantId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nueva-feature', tenantId] });
      toast.success('Creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NuevaFeatureUpdate }) =>
      service.updateNuevaFeature(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nueva-feature'] });
      toast.success('Actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const remove = useMutation({
    mutationFn: service.deleteNuevaFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nueva-feature', tenantId] });
      toast.success('Eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

  return { create, update, remove };
}
```

## Paso 5: Crear Componentes

### Lista

```typescript
// src/features/nueva-feature/components/NuevaFeatureList.tsx
import type { NuevaFeature } from '../types';
import { NuevaFeatureCard } from './NuevaFeatureCard';

interface Props {
  items: NuevaFeature[];
  onSelect?: (item: NuevaFeature) => void;
}

export function NuevaFeatureList({ items, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay elementos
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <NuevaFeatureCard
          key={item.id}
          item={item}
          onClick={() => onSelect?.(item)}
        />
      ))}
    </div>
  );
}
```

### Formulario

```typescript
// src/features/nueva-feature/components/NuevaFeatureForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export function NuevaFeatureForm({
  defaultValues,
  onSubmit,
  isLoading,
}: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar'}
        </Button>
      </form>
    </Form>
  );
}
```

## Paso 6: Crear Pagina

```typescript
// src/pages/NuevaFeature.tsx
import { useState } from 'react';
import { useRealtime } from '@/hooks/use-realtime';
import { useProfile } from '@/hooks/use-profile';
import { useNuevaFeatureList } from '@/features/nueva-feature/hooks/useNuevaFeature';
import { useNuevaFeatureMutations } from '@/features/nueva-feature/hooks/useNuevaFeatureMutations';
import { NuevaFeatureList } from '@/features/nueva-feature/components/NuevaFeatureList';
import { NuevaFeatureForm } from '@/features/nueva-feature/components/NuevaFeatureForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function NuevaFeaturePage() {
  const { tenantId } = useProfile();
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useNuevaFeatureList(filters, page);
  const { create } = useNuevaFeatureMutations();

  // Realtime
  useRealtime({
    subscriptions: [
      {
        table: 'nueva_feature',
        filter: `tenant_id=eq.${tenantId}`,
        queryKeysToInvalidate: [['nueva-feature', tenantId]],
      },
    ],
    enabled: !!tenantId,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nueva Feature</h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Crear nuevo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo</DialogTitle>
            </DialogHeader>
            <NuevaFeatureForm
              onSubmit={(data) => {
                create.mutate(data, {
                  onSuccess: () => setDialogOpen(false),
                });
              }}
              isLoading={create.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Cargando...</div>
      ) : (
        <NuevaFeatureList items={data?.data ?? []} />
      )}
    </div>
  );
}
```

## Paso 7: Agregar Ruta

```typescript
// src/App.tsx
import NuevaFeaturePage from '@/pages/NuevaFeature';

// En el router
{
  element: <UserClientRoute><AppLayout /></UserClientRoute>,
  children: [
    // ... otras rutas
    { path: '/nueva-feature', element: <NuevaFeaturePage /> },
  ],
}
```

## Paso 8: Agregar al Sidebar

```typescript
// src/components/layout/Sidebar.tsx
const navigation = [
  // ... otras
  { name: 'Nueva Feature', href: '/nueva-feature', icon: IconComponent },
];
```

## Resultado

Tu nueva feature esta lista con:
- Tipos TypeScript
- Servicio con CRUD
- Hooks de React Query
- Componentes de UI
- Pagina con ruta
- Realtime updates
