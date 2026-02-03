# Feature: Calls

Gestión y tracking de llamadas telefónicas.

## Descripción

El módulo Calls permite rastrear llamadas entrantes y salientes, grabar conversaciones, ver transcripciones y analizar métricas de llamadas. Integrado con Twilio para funcionalidad de telefonía.

## Casos de Uso

1. Ver historial de llamadas con filtros
2. Escuchar grabaciones de llamadas
3. Ver transcripciones de llamadas
4. Analizar estadísticas de llamadas
5. Filtrar por agente, contacto, estado

## Estructura de Archivos

```
src/features/calls/
├── components/
│   ├── CallsList.tsx
│   ├── CallCard.tsx
│   ├── CallDetails.tsx
│   ├── CallRecordingPlayer.tsx
│   ├── CallTranscript.tsx
│   ├── CallsFilters.tsx
│   └── CallsStats.tsx
├── hooks/
│   ├── useCalls.ts
│   ├── useCallStats.ts
│   └── useCall.ts
├── services/
│   └── calls.service.ts
└── types/
    └── index.ts
```

## Base de Datos

### Tabla: crm_calls

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK a tenants |
| contact_id | UUID | FK a crm_contacts |
| agent_id | UUID | FK a profiles |
| call_sid | TEXT | ID único de Twilio |
| from_number | TEXT | Número origen |
| to_number | TEXT | Número destino |
| direction | ENUM | 'inbound', 'outbound' |
| state | ENUM | Estado de la llamada |
| started_at | TIMESTAMPTZ | Inicio |
| ended_at | TIMESTAMPTZ | Fin |
| duration_seconds | INTEGER | Duración |
| recording_url | TEXT | URL de grabación |
| transcript | TEXT | Transcripción |
| notes | TEXT | Notas manuales |
| metadata | JSONB | Datos adicionales |

### Estados de Llamada (call_state)

| Estado | Descripción |
|--------|-------------|
| `pending` | Llamada iniciada, no conectada |
| `completed` | Llamada completada |
| `failed` | Error en la llamada |
| `missed` | No contestada |
| `voicemail` | Dejó mensaje de voz |
| `user_hangup` | Usuario colgó |
| `scheduled` | Programada para el futuro |

## Hooks

### useCalls

```typescript
// src/features/calls/hooks/useCalls.ts
interface CallFilters {
  search?: string;
  state?: CallState[];
  direction?: 'inbound' | 'outbound';
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useCalls(
  filters: CallFilters,
  page: number = 1,
  sort: SortConfig = { field: 'started_at', direction: 'desc' }
) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['calls', tenantId, filters, page, sort],
    queryFn: () => callsService.getCalls(tenantId!, filters, page, sort),
    enabled: !!tenantId,
    placeholderData: (prev) => prev,
  });
}
```

### useCallStats

```typescript
// src/features/calls/hooks/useCallStats.ts
export function useCallStats(filters: StatsFilters) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['calls-stats', tenantId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_calls_stats', {
        p_tenant_id: tenantId,
        p_date_from: filters.dateFrom,
        p_date_to: filters.dateTo,
        p_states: filters.states,
        p_types: filters.types,
      });
      if (error) throw error;
      return data[0];
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
}
```

### useCall

```typescript
// Hook para una llamada específica
export function useCall(callId: string | undefined) {
  return useQuery({
    queryKey: ['call', callId],
    queryFn: () => callsService.getCallById(callId!),
    enabled: !!callId,
  });
}
```

## Servicio

```typescript
// src/features/calls/services/calls.service.ts
export async function getCalls(
  tenantId: string,
  filters: CallFilters,
  page: number,
  sort: SortConfig
): Promise<CallsResponse> {
  let query = supabase
    .from('crm_calls')
    .select(`
      *,
      contact:crm_contacts(id, nombre, numero),
      agent:profiles(id, full_name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Filtros
  if (filters.search) {
    query = query.or(`
      contact.nombre.ilike.%${filters.search}%,
      contact.numero.ilike.%${filters.search}%,
      from_number.ilike.%${filters.search}%
    `);
  }

  if (filters.state?.length) {
    query = query.in('state', filters.state);
  }

  if (filters.direction) {
    query = query.eq('direction', filters.direction);
  }

  if (filters.agentId) {
    query = query.eq('agent_id', filters.agentId);
  }

  if (filters.dateFrom) {
    query = query.gte('started_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('started_at', filters.dateTo);
  }

  // Ordenamiento
  query = query.order(sort.field, { ascending: sort.direction === 'asc' });

  // Paginación
  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

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
```

## Componentes

### CallsList

```typescript
// src/features/calls/components/CallsList.tsx
interface Props {
  calls: Call[];
  onSelect: (call: Call) => void;
  selectedId?: string;
}

export function CallsList({ calls, onSelect, selectedId }: Props) {
  return (
    <div className="divide-y">
      {calls.map((call) => (
        <CallCard
          key={call.id}
          call={call}
          isSelected={call.id === selectedId}
          onClick={() => onSelect(call)}
        />
      ))}
    </div>
  );
}
```

### CallCard

```typescript
// src/features/calls/components/CallCard.tsx
export function CallCard({ call, isSelected, onClick }: CallCardProps) {
  const stateConfig = {
    completed: { icon: PhoneCall, color: 'text-green-500', label: 'Completada' },
    missed: { icon: PhoneMissed, color: 'text-red-500', label: 'Perdida' },
    failed: { icon: PhoneOff, color: 'text-red-500', label: 'Fallida' },
    pending: { icon: Phone, color: 'text-yellow-500', label: 'En curso' },
  };

  const config = stateConfig[call.state] || stateConfig.pending;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'p-4 cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-muted'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', config.color)} />

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {call.contact?.nombre || call.from_number}
          </p>
          <p className="text-sm text-muted-foreground">
            {call.direction === 'inbound' ? 'Entrante' : 'Saliente'}
            {' · '}
            {formatDuration(call.duration_seconds)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm">{format(call.started_at, 'HH:mm')}</p>
          <p className="text-xs text-muted-foreground">
            {format(call.started_at, 'dd/MM')}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### CallRecordingPlayer

```typescript
// src/features/calls/components/CallRecordingPlayer.tsx
export function CallRecordingPlayer({ recordingUrl, duration }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <audio
        ref={audioRef}
        src={recordingUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
      />

      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          audioRef.current?.[isPlaying ? 'pause' : 'play']();
          setIsPlaying(!isPlaying);
        }}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Slider
        value={[currentTime]}
        max={duration}
        step={1}
        onValueChange={([value]) => {
          if (audioRef.current) audioRef.current.currentTime = value;
        }}
        className="flex-1"
      />

      <span className="text-sm text-muted-foreground w-20 text-right">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>

      <Button size="icon" variant="ghost" asChild>
        <a href={recordingUrl} download>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
```

### CallsStats

```typescript
// src/features/calls/components/CallsStats.tsx
export function CallsStats({ stats }: { stats: CallStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Total Llamadas"
        value={stats.total}
        icon={Phone}
      />
      <StatCard
        title="Completadas"
        value={stats.completed}
        icon={PhoneCall}
        color="green"
      />
      <StatCard
        title="Perdidas"
        value={stats.missed}
        icon={PhoneMissed}
        color="red"
      />
      <StatCard
        title="Duración Promedio"
        value={formatDuration(stats.avg_duration)}
        icon={Clock}
      />
    </div>
  );
}
```

## Rutas

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/calls` | CallsPage | Lista de llamadas |
| `/calls/:id` | CallDetailsPage | Detalle de llamada |

## Realtime

```typescript
// En CallsPage
useRealtime({
  subscriptions: [
    {
      table: 'crm_calls',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['calls', tenantId], ['calls-stats', tenantId]],
    },
  ],
  enabled: !!tenantId,
});
```

## RPC Functions

### calculate_calls_stats

```sql
CREATE FUNCTION calculate_calls_stats(
  p_tenant_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_states call_state[] DEFAULT NULL,
  p_types call_type[] DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  total BIGINT,
  completed BIGINT,
  failed BIGINT,
  missed BIGINT,
  pending BIGINT,
  scheduled BIGINT,
  voicemail BIGINT,
  user_hangup BIGINT,
  avg_duration NUMERIC,
  total_duration BIGINT,
  completion_rate NUMERIC
)
```

## Edge Functions

- **twilio-webhook** - Recibe llamadas entrantes
- **twilio-status** - Actualiza estados de llamada
- **initiate-call** - Inicia llamadas salientes

Ver [Twilio Integration](../07-integrations/twilio.md) para detalles.
