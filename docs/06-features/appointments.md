# Appointments

Sistema de gestion de citas telefonicas y presenciales.

## Descripcion

El modulo de citas permite programar y gestionar citas con clientes. Soporta dos tipos: citas telefonicas (call) y citas presenciales (in_person). Incluye verificacion de disponibilidad, estadisticas y API externa para integracion con AI agents.

## Casos de Uso

1. Crear cita telefonica o presencial
2. Ver calendario de citas
3. Verificar disponibilidad de agentes/sedes
4. Confirmar/cancelar citas
5. Ver estadisticas de citas
6. Integracion con AI para crear citas automaticamente

## Estructura de Archivos

```
src/features/appointments/
├── components/
│   ├── AppointmentList.tsx       # Lista de citas
│   ├── AppointmentCard.tsx       # Card individual
│   ├── AppointmentForm.tsx       # Formulario
│   ├── AppointmentCalendar.tsx   # Vista calendario
│   ├── AppointmentStats.tsx      # Estadisticas
│   ├── AvailabilityPicker.tsx    # Selector de horarios
│   └── AppointmentDetail.tsx     # Detalle
├── hooks/
│   ├── useAppointments.ts        # Lista
│   ├── useAppointment.ts         # Individual
│   ├── useAppointmentMutations.ts # Mutations
│   ├── useAppointmentStats.ts    # Estadisticas
│   └── useAvailability.ts        # Disponibilidad
├── services/
│   └── appointment.service.ts
└── types/
    └── index.ts
```

## Base de Datos

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `appointments` | Citas |
| `tenant_locations` | Sedes para citas presenciales |

### Enums

```typescript
type AppointmentType = 'call' | 'in_person';
type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';
```

### Schema appointments

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador |
| `tenant_id` | UUID | FK a tenants |
| `type` | appointment_type | 'call' o 'in_person' |
| `contact_id` | UUID | FK a crm_contacts |
| `agent_id` | UUID | FK a profiles (opcional para call) |
| `location_id` | UUID | FK a tenant_locations |
| `scheduled_at` | TIMESTAMP | Fecha/hora |
| `duration_minutes` | INT | Duracion (default 30) |
| `timezone` | TEXT | Zona horaria |
| `status` | appointment_status | Estado |
| `title` | TEXT | Titulo |
| `description` | TEXT | Descripcion |
| `call_phone_number` | TEXT | Telefono para llamadas |

## Hooks

### useAppointments

```typescript
const {
  data,
  isLoading,
} = useAppointments({
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  type: 'call',
  status: ['scheduled', 'confirmed'],
});
```

### useAppointmentStats

```typescript
const { data: stats } = useAppointmentStats({
  dateFrom,
  dateTo,
  type,
  locationId,
});

// stats: {
//   total, scheduled, confirmed, completed,
//   cancelled, no_show, completion_rate, etc.
// }
```

### useAvailability

```typescript
const {
  data: slots,
  isLoading,
} = useAvailability({
  date: '2024-01-15',
  type: 'in_person',
  locationId: 'location-id',
  duration: 30,
});

// slots: ['09:00', '09:30', '10:00', ...]
```

### useAppointmentMutations

```typescript
const {
  createAppointment,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  rescheduleAppointment,
} = useAppointmentMutations();

// Crear cita telefonica
createAppointment.mutate({
  type: 'call',
  contactId,
  scheduledAt: '2024-01-15T10:00:00Z',
  durationMinutes: 30,
  callPhoneNumber: '+525512345678',
  title: 'Llamada de seguimiento',
});

// Crear cita presencial
createAppointment.mutate({
  type: 'in_person',
  contactId,
  agentId,
  locationId,
  scheduledAt: '2024-01-15T10:00:00Z',
  durationMinutes: 60,
  title: 'Reunion inicial',
});

// Cancelar
cancelAppointment.mutate({
  id: appointmentId,
  reason: 'Cliente no disponible',
});
```

## Componentes

### AppointmentForm

```typescript
<AppointmentForm
  defaultValues={appointment}
  contacts={contacts}
  agents={agents}
  locations={locations}
  onSubmit={(data) => createAppointment.mutate(data)}
  isLoading={createAppointment.isPending}
/>
```

### AvailabilityPicker

```typescript
<AvailabilityPicker
  date={selectedDate}
  type={appointmentType}
  locationId={selectedLocation}
  agentId={selectedAgent}
  duration={30}
  onSelect={(time) => setSelectedTime(time)}
/>
```

## Edge Functions

| Funcion | Descripcion |
|---------|-------------|
| `external-appointments-api` | API publica para crear citas |

### API Externa

Para integracion con AI agents:

```typescript
// Headers
{
  'x-tenant-id': 'tenant-uuid',
  'x-api-key': 'api-key'
}

// Crear cita
POST /external-appointments-api
{
  "action": "create",
  "appointment": {
    "type": "call",
    "contact_phone": "+525512345678",
    "scheduled_at": "2024-01-15T10:00:00Z",
    "duration_minutes": 30,
    "customer_notes": "Cliente solicita informacion sobre..."
  }
}

// Obtener disponibilidad
POST /external-appointments-api
{
  "action": "availability",
  "date": "2024-01-15",
  "type": "call"
}
// Response: { "slots": ["09:00", "09:30", ...] }

// Listar citas de un contacto
POST /external-appointments-api
{
  "action": "list-by-contact",
  "contact_phone": "+525512345678"
}
```

## Funciones SQL

### check_appointment_availability

Verifica si hay conflictos de horario.

```sql
SELECT check_appointment_availability(
  p_tenant_id,
  p_type,
  p_scheduled_at,
  p_duration_minutes,
  p_agent_id,     -- opcional
  p_location_id,  -- opcional
  p_exclude_id    -- para edicion
);
-- Retorna: true si disponible, false si hay conflicto
```

### calculate_appointments_stats

Calcula estadisticas.

```sql
SELECT * FROM calculate_appointments_stats(
  p_tenant_id,
  p_date_from,
  p_date_to,
  p_type,
  p_location_id,
  p_agent_id
);
```

### get_contact_upcoming_appointments

Proximas citas de un contacto.

```sql
SELECT * FROM get_contact_upcoming_appointments(
  p_contact_id,
  p_limit
);
```

## Vista v_appointments_detailed

Combina datos de cita con contacto, agente, sede y llamada:

```typescript
type AppointmentDetailed = {
  // Datos de cita
  id, tenant_id, type, status, scheduled_at, duration_minutes, ...
  // Contacto
  contact_name, contact_phone, contact_attributes,
  // Agente
  agent_email,
  // Sede
  location_name, location_address, location_city, location_phone,
  // Llamada (si existe)
  call_state, call_duration,
  // Calculados
  time_status, // 'upcoming' | 'ongoing' | 'past'
  scheduled_end_at,
};
```

## Estados y Transiciones

```
scheduled
    │
    ├──► confirmed (cliente confirma)
    │        │
    │        ├──► in_progress (empieza la cita)
    │        │        │
    │        │        └──► completed (termina exitosamente)
    │        │
    │        └──► no_show (cliente no asiste)
    │
    ├──► cancelled (cualquier momento antes)
    │
    └──► rescheduled (se cambia fecha)
              │
              └──► scheduled (nueva cita)
```

## Realtime

```typescript
useRealtime({
  subscriptions: [{
    table: 'appointments',
    filter: `tenant_id=eq.${tenantId}`,
    queryKeysToInvalidate: [['appointments', tenantId]],
  }],
});
```

## Validacion

```typescript
const appointmentSchema = z.object({
  type: z.enum(['call', 'in_person']),
  contactId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().min(15).max(240),
  title: z.string().optional(),

  // Condicionales
  callPhoneNumber: z.string().optional(),
  agentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
}).refine((data) => {
  if (data.type === 'call') {
    return !!data.callPhoneNumber;
  }
  if (data.type === 'in_person') {
    return !!data.locationId;
  }
  return true;
}, {
  message: 'Telefono requerido para call, sede para in_person',
});
```

## Consideraciones

- `agent_id` es opcional para citas tipo 'call' (pueden ser atendidas por AI)
- `location_id` es requerido para citas 'in_person'
- La verificacion de disponibilidad considera agent_id Y location_id
- Usar timezone del cliente para mostrar correctamente

## Permisos

| Accion | user_client | super_admin |
|--------|-------------|-------------|
| Ver | Solo su tenant | Todos |
| Crear | Solo su tenant | Todos |
| Cancelar | Solo su tenant | Todos |
| API externa | Con API key | Con API key |
