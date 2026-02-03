# Feature: Locations

Gestión de sedes físicas para citas presenciales.

## Descripción

El módulo Locations permite administrar las diferentes ubicaciones físicas donde se pueden programar citas presenciales. Cada sede tiene su propia disponibilidad, capacidad y agentes asignados.

## Casos de Uso

1. Crear y configurar sedes físicas
2. Asignar agentes a sedes
3. Configurar horarios por sede
4. Ver estadísticas de citas por sede
5. Gestionar capacidad y disponibilidad

## Estructura de Archivos

```
src/features/locations/
├── components/
│   ├── LocationsList.tsx
│   ├── LocationCard.tsx
│   ├── LocationForm.tsx
│   ├── LocationSchedule.tsx
│   └── LocationAgents.tsx
├── hooks/
│   ├── useLocations.ts
│   ├── useLocation.ts
│   └── useLocationMutations.ts
├── services/
│   └── locations.service.ts
└── types/
    └── index.ts
```

## Base de Datos

### Tabla: locations

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK a tenants |
| name | TEXT | Nombre de la sede |
| address | TEXT | Dirección completa |
| city | TEXT | Ciudad |
| phone | TEXT | Teléfono de contacto |
| email | TEXT | Email de contacto |
| capacity | INTEGER | Capacidad máxima |
| is_active | BOOLEAN | Si está activa |
| schedule | JSONB | Horarios de operación |
| metadata | JSONB | Datos adicionales |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |

### Estructura de Schedule

```typescript
interface LocationSchedule {
  monday: DaySchedule | null;
  tuesday: DaySchedule | null;
  wednesday: DaySchedule | null;
  thursday: DaySchedule | null;
  friday: DaySchedule | null;
  saturday: DaySchedule | null;
  sunday: DaySchedule | null;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "13:00"
}
```

Ejemplo:
```json
{
  "monday": {
    "enabled": true,
    "slots": [
      { "start": "09:00", "end": "13:00" },
      { "start": "15:00", "end": "19:00" }
    ]
  },
  "saturday": {
    "enabled": true,
    "slots": [
      { "start": "10:00", "end": "14:00" }
    ]
  },
  "sunday": null
}
```

### Tabla: location_agents

Relación many-to-many entre sedes y agentes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| location_id | UUID | FK a locations |
| agent_id | UUID | FK a profiles |
| is_primary | BOOLEAN | Si es sede principal del agente |
| created_at | TIMESTAMPTZ | Fecha de asignación |

## Tipos

```typescript
// src/features/locations/types/index.ts
import type { Database } from '@/integrations/supabase/types';

export type Location = Database['public']['Tables']['locations']['Row'];
export type LocationInsert = Database['public']['Tables']['locations']['Insert'];
export type LocationUpdate = Database['public']['Tables']['locations']['Update'];

export interface LocationWithAgents extends Location {
  agents: {
    id: string;
    full_name: string;
    is_primary: boolean;
  }[];
  appointments_count: number;
}

export interface LocationFilters {
  search?: string;
  isActive?: boolean;
  city?: string;
}
```

## Hooks

### useLocations

```typescript
// src/features/locations/hooks/useLocations.ts
export function useLocations(filters: LocationFilters = {}) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['locations', tenantId, filters],
    queryFn: () => locationsService.getLocations(tenantId!, filters),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });
}
```

### useLocation

```typescript
export function useLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location', locationId],
    queryFn: () => locationsService.getLocationById(locationId!),
    enabled: !!locationId,
  });
}
```

### useLocationMutations

```typescript
export function useLocationMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  const create = useMutation({
    mutationFn: (data: Omit<LocationInsert, 'tenant_id'>) =>
      locationsService.createLocation({ ...data, tenant_id: tenantId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', tenantId] });
      toast.success('Sede creada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear sede');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationUpdate }) =>
      locationsService.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Sede actualizada');
    },
  });

  const remove = useMutation({
    mutationFn: locationsService.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', tenantId] });
      toast.success('Sede eliminada');
    },
  });

  const assignAgent = useMutation({
    mutationFn: ({ locationId, agentId, isPrimary }: AssignAgentParams) =>
      locationsService.assignAgent(locationId, agentId, isPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Agente asignado');
    },
  });

  const removeAgent = useMutation({
    mutationFn: ({ locationId, agentId }: { locationId: string; agentId: string }) =>
      locationsService.removeAgent(locationId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Agente removido');
    },
  });

  return { create, update, remove, assignAgent, removeAgent };
}
```

## Servicio

```typescript
// src/features/locations/services/locations.service.ts
export async function getLocations(
  tenantId: string,
  filters: LocationFilters
): Promise<LocationWithAgents[]> {
  let query = supabase
    .from('locations')
    .select(`
      *,
      location_agents(
        agent:profiles(id, full_name),
        is_primary
      )
    `)
    .eq('tenant_id', tenantId);

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  query = query.order('name');

  const { data, error } = await query;
  if (error) throw error;

  return data.map((location) => ({
    ...location,
    agents: location.location_agents.map((la: any) => ({
      id: la.agent.id,
      full_name: la.agent.full_name,
      is_primary: la.is_primary,
    })),
  }));
}

export async function assignAgent(
  locationId: string,
  agentId: string,
  isPrimary: boolean
): Promise<void> {
  // Si es primary, quitar primary de otras sedes para este agente
  if (isPrimary) {
    await supabase
      .from('location_agents')
      .update({ is_primary: false })
      .eq('agent_id', agentId);
  }

  const { error } = await supabase
    .from('location_agents')
    .upsert({
      location_id: locationId,
      agent_id: agentId,
      is_primary: isPrimary,
    }, {
      onConflict: 'location_id,agent_id',
    });

  if (error) throw error;
}
```

## Componentes

### LocationForm

```typescript
// src/features/locations/components/LocationForm.tsx
const locationSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  address: z.string().min(1, 'Dirección requerida'),
  city: z.string().min(1, 'Ciudad requerida'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  capacity: z.number().min(1).default(10),
  is_active: z.boolean().default(true),
  schedule: z.record(z.any()).default({}),
});

export function LocationForm({ defaultValues, onSubmit, isLoading }: Props) {
  const form = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      capacity: 10,
      is_active: true,
      schedule: DEFAULT_SCHEDULE,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Campos básicos */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Sede</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Oficina Central" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ciudad de México" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidad</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección Completa</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Calle, número, colonia..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Horarios */}
        <LocationSchedule control={form.control} />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### LocationSchedule

```typescript
// src/features/locations/components/LocationSchedule.tsx
const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export function LocationSchedule({ control }: { control: Control<any> }) {
  const schedule = useWatch({ control, name: 'schedule' });

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Horarios de Operación</h3>

      {DAYS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-4">
          <div className="w-24">
            <Checkbox
              checked={schedule[key]?.enabled}
              onCheckedChange={(checked) => {
                // Update schedule
              }}
            />
            <span className="ml-2">{label}</span>
          </div>

          {schedule[key]?.enabled && (
            <div className="flex-1 flex gap-2">
              {schedule[key].slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={slot.start}
                    className="w-24"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={slot.end}
                    className="w-24"
                  />
                </div>
              ))}
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Rutas

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/locations` | LocationsPage | Lista de sedes |
| `/locations/new` | NewLocationPage | Crear sede |
| `/locations/:id` | LocationDetailPage | Detalle y configuración |
| `/locations/:id/agents` | LocationAgentsPage | Gestión de agentes |

## Integración con Appointments

Las sedes se usan en el módulo de citas:

```typescript
// Al crear cita presencial
const appointmentData = {
  type: 'in_person',
  location_id: selectedLocation.id, // FK a locations
  // ...
};

// Verificar disponibilidad considera horarios de sede
const isAvailable = await supabase.rpc('check_appointment_availability', {
  p_location_id: locationId,
  p_scheduled_at: scheduledAt,
  // ...
});
```
