# RPC Functions

Funciones SQL invocables via API.

## Estadisticas

### calculate_calls_stats

Calcula estadisticas de llamadas.

```typescript
const { data } = await supabase.rpc('calculate_calls_stats', {
  p_tenant_id: tenantId,
  p_date_from: '2024-01-01',
  p_date_to: '2024-12-31',
  p_states: ['completed', 'failed'],
  p_types: ['inbound', 'outbound'],
  p_search_term: 'juan',
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_tenant_id` | UUID | No | Filtrar por tenant |
| `p_date_from` | TIMESTAMP | No | Fecha inicio |
| `p_date_to` | TIMESTAMP | No | Fecha fin |
| `p_states` | call_state[] | No | Estados a incluir |
| `p_types` | call_type[] | No | Tipos a incluir |
| `p_search_term` | TEXT | No | Buscar en contacto |

**Response:**
```typescript
{
  total: number,
  completed: number,
  failed: number,
  missed: number,
  pending: number,
  scheduled: number,
  voicemail: number,
  user_hangup: number,
  avg_duration: number,
  total_duration: number,
  completion_rate: number
}
```

### calculate_appointments_stats

Calcula estadisticas de citas.

```typescript
const { data } = await supabase.rpc('calculate_appointments_stats', {
  p_tenant_id: tenantId,
  p_date_from: '2024-01-01',
  p_date_to: '2024-12-31',
  p_type: 'call',
  p_location_id: 'uuid',
  p_agent_id: 'uuid',
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_tenant_id` | UUID | No | Filtrar por tenant |
| `p_date_from` | TIMESTAMP | No | Fecha inicio |
| `p_date_to` | TIMESTAMP | No | Fecha fin |
| `p_type` | appointment_type | No | Tipo de cita |
| `p_location_id` | UUID | No | Filtrar por sede |
| `p_agent_id` | UUID | No | Filtrar por agente |

**Response:**
```typescript
{
  total: number,
  scheduled: number,
  confirmed: number,
  completed: number,
  cancelled: number,
  no_show: number,
  in_progress: number,
  completion_rate: number,
  cancellation_rate: number,
  no_show_rate: number,
  calls_count: number,
  in_person_count: number,
  avg_duration_minutes: number
}
```

## Citas

### check_appointment_availability

Verifica disponibilidad para una cita.

```typescript
const { data: isAvailable } = await supabase.rpc('check_appointment_availability', {
  p_tenant_id: tenantId,
  p_type: 'call',
  p_scheduled_at: '2024-01-15T10:00:00Z',
  p_duration_minutes: 30,
  p_agent_id: 'uuid',
  p_location_id: null,
  p_exclude_appointment_id: null,
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_tenant_id` | UUID | Si | Tenant ID |
| `p_type` | appointment_type | Si | Tipo de cita |
| `p_scheduled_at` | TIMESTAMP | Si | Fecha/hora propuesta |
| `p_duration_minutes` | INT | Si | Duracion en minutos |
| `p_agent_id` | UUID | No | Agente a verificar |
| `p_location_id` | UUID | No | Sede a verificar |
| `p_exclude_appointment_id` | UUID | No | Excluir cita (para edicion) |

**Response:** `boolean` - `true` si disponible

### get_contact_upcoming_appointments

Obtiene proximas citas de un contacto.

```typescript
const { data: appointments } = await supabase.rpc('get_contact_upcoming_appointments', {
  p_contact_id: contactId,
  p_limit: 5,
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_contact_id` | UUID | Si | ID del contacto |
| `p_limit` | INT | No | Limite de resultados (default 5) |

**Response:** Array de citas detalladas (v_appointments_detailed)

## Campanas

### increment_campaign_batch

Incrementa contador de batch de campana.

```typescript
const { data } = await supabase.rpc('increment_campaign_batch', {
  p_campaign_id: campaignId,
  p_status: 'sent', // o 'failed'
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_campaign_id` | UUID | Si | ID de la campana |
| `p_status` | TEXT | Si | 'sent' o 'failed' |

**Response:** void

**Comportamiento:**
- Incrementa `batches_sent` o `batches_failed`
- Automaticamente marca campana como `completed` cuando todos los batches estan procesados

## Usuarios

### is_super_admin

Verifica si un usuario es super admin.

```typescript
const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
  p_user_id: userId,
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_user_id` | UUID | Si | ID del usuario |

**Response:** `boolean`

### has_role

Verifica si usuario tiene un rol especifico.

```typescript
const { data: hasRole } = await supabase.rpc('has_role', {
  _role: 'super_admin',
  _user_id: userId,
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `_role` | app_role | Si | Rol a verificar |
| `_user_id` | UUID | Si | ID del usuario |

**Response:** `boolean`

### get_user_tenant_id

Obtiene tenant_id de un usuario.

```typescript
const { data: tenantId } = await supabase.rpc('get_user_tenant_id', {
  p_user_id: userId,
});
```

**Parametros:**
| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `p_user_id` | UUID | Si | ID del usuario |

**Response:** `UUID | null`

## Mantenimiento

### clean_expired_invitations

Limpia invitaciones expiradas.

```typescript
const { data } = await supabase.rpc('clean_expired_invitations');
```

**Parametros:** Ninguno

**Response:** void

**Comportamiento:** Marca como 'expired' todas las invitaciones con `expires_at < NOW()` y status 'pending'.

## Uso desde Frontend

```typescript
// En un hook o servicio
export async function getCallStats(filters: StatsFilters) {
  const { data, error } = await supabase.rpc('calculate_calls_stats', {
    p_tenant_id: filters.tenantId,
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
  });

  if (error) throw error;
  return data[0]; // RPC retorna array
}
```

## Uso en Hook

```typescript
export function useCallStats(filters: StatsFilters) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: ['calls-stats', tenantId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_calls_stats', {
        p_tenant_id: tenantId,
        ...filters,
      });
      if (error) throw error;
      return data[0];
    },
    enabled: !!tenantId,
  });
}
```
