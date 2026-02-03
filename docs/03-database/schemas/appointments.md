# Tabla: appointments

## Descripcion

Citas programadas con clientes. Soporta citas telefonicas y presenciales.

## Columnas

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `tenant_id` | UUID | NO | - | FK a tenants |
| `type` | appointment_type | NO | - | Tipo: 'call' o 'in_person' |
| `contact_id` | UUID | NO | - | FK a crm_contacts |
| `agent_id` | UUID | SI | NULL | FK a profiles (agente asignado) |
| `location_id` | UUID | SI | NULL | FK a tenant_locations |
| `scheduled_at` | TIMESTAMP | NO | - | Fecha/hora programada |
| `duration_minutes` | INT | NO | `30` | Duracion en minutos |
| `timezone` | TEXT | NO | `'UTC'` | Zona horaria |
| `status` | appointment_status | NO | `'scheduled'` | Estado de la cita |
| `title` | TEXT | SI | NULL | Titulo de la cita |
| `description` | TEXT | SI | NULL | Descripcion |
| `customer_notes` | TEXT | SI | NULL | Notas del cliente |
| `call_phone_number` | TEXT | SI | NULL | Telefono para llamadas |
| `call_id` | UUID | SI | NULL | FK a crm_calls (si se realizo) |
| `reminder_sent_at` | TIMESTAMP | SI | NULL | Cuando se envio recordatorio |
| `confirmation_sent_at` | TIMESTAMP | SI | NULL | Cuando se envio confirmacion |
| `cancelled_at` | TIMESTAMP | SI | NULL | Fecha de cancelacion |
| `cancelled_reason` | TEXT | SI | NULL | Razon de cancelacion |
| `metadata` | JSONB | NO | `'{}'` | Metadatos adicionales |
| `created_by` | UUID | SI | NULL | FK a profiles (quien creo) |
| `created_at` | TIMESTAMP | NO | `NOW()` | Fecha de creacion |
| `updated_at` | TIMESTAMP | NO | `NOW()` | Ultima actualizacion |

## Enums

### appointment_type

```sql
CREATE TYPE appointment_type AS ENUM (
  'call',       -- Cita telefonica
  'in_person'   -- Cita presencial
);
```

### appointment_status

```sql
CREATE TYPE appointment_status AS ENUM (
  'scheduled',    -- Programada
  'confirmed',    -- Confirmada por cliente
  'in_progress',  -- En curso
  'completed',    -- Completada
  'cancelled',    -- Cancelada
  'no_show',      -- Cliente no asistio
  'rescheduled'   -- Reprogramada
);
```

## Relaciones

### Foreign Keys

| Columna | Referencia |
|---------|------------|
| `tenant_id` | `tenants(id)` |
| `contact_id` | `crm_contacts(id)` |
| `agent_id` | `profiles(id)` |
| `location_id` | `tenant_locations(id)` |
| `call_id` | `crm_calls(id)` |
| `created_by` | `profiles(id)` |

## RLS Policies

```sql
CREATE POLICY "tenant_appointments_select" ON appointments
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_appointments_insert" ON appointments
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_appointments_update" ON appointments
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_appointments_delete" ON appointments
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

## Indices

```sql
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_contact ON appointments(contact_id);
CREATE INDEX idx_appointments_agent ON appointments(agent_id);
CREATE INDEX idx_appointments_location ON appointments(location_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Indice para buscar disponibilidad
CREATE INDEX idx_appointments_availability
ON appointments(tenant_id, agent_id, location_id, scheduled_at)
WHERE status NOT IN ('cancelled', 'no_show');
```

## Queries Comunes

### Listar citas de hoy

```sql
SELECT *
FROM v_appointments_detailed
WHERE tenant_id = $1
  AND scheduled_at::DATE = CURRENT_DATE
ORDER BY scheduled_at ASC;
```

### Proximas citas de un contacto

```sql
SELECT *
FROM v_appointments_detailed
WHERE contact_id = $1
  AND status IN ('scheduled', 'confirmed')
  AND scheduled_at > NOW()
ORDER BY scheduled_at ASC
LIMIT 5;
```

### Verificar disponibilidad

```sql
SELECT check_appointment_availability(
  $1,  -- tenant_id
  $2,  -- type
  $3,  -- scheduled_at
  $4,  -- duration_minutes
  $5,  -- agent_id (opcional)
  $6,  -- location_id (opcional)
  $7   -- exclude_appointment_id (para edicion)
);
```

### Crear cita

```sql
INSERT INTO appointments (
  tenant_id, type, contact_id, agent_id, location_id,
  scheduled_at, duration_minutes, timezone, title
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;
```

### Cancelar cita

```sql
UPDATE appointments
SET
  status = 'cancelled',
  cancelled_at = NOW(),
  cancelled_reason = $2,
  updated_at = NOW()
WHERE id = $1
RETURNING *;
```

### Estadisticas de citas

```sql
SELECT * FROM calculate_appointments_stats(
  p_tenant_id := $1,
  p_date_from := $2,
  p_date_to := $3,
  p_type := $4,
  p_location_id := $5,
  p_agent_id := $6
);
```

## Vista v_appointments_detailed

```sql
SELECT
  a.*,
  ct.nombre AS contact_name,
  ct.numero AS contact_phone,
  ct.attributes AS contact_attributes,
  p.email AS agent_email,
  l.name AS location_name,
  l.address_line1 AS location_address,
  l.city AS location_city,
  l.phone AS location_phone,
  c.state AS call_state,
  c.duration_seconds AS call_duration,
  CASE
    WHEN a.scheduled_at > NOW() THEN 'upcoming'
    WHEN a.scheduled_at + (a.duration_minutes || ' minutes')::INTERVAL > NOW() THEN 'ongoing'
    ELSE 'past'
  END AS time_status,
  a.scheduled_at + (a.duration_minutes || ' minutes')::INTERVAL AS scheduled_end_at
FROM appointments a
LEFT JOIN crm_contacts ct ON a.contact_id = ct.id
LEFT JOIN profiles p ON a.agent_id = p.id
LEFT JOIN tenant_locations l ON a.location_id = l.id
LEFT JOIN crm_calls c ON a.call_id = c.id;
```

## TypeScript Type

```typescript
import type { Database } from '@/integrations/supabase/types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentType = Database['public']['Enums']['appointment_type'];
type AppointmentStatus = Database['public']['Enums']['appointment_status'];

// Vista detallada
type AppointmentDetailed = Database['public']['Views']['v_appointments_detailed']['Row'];
```

## Notas

- `type = 'call'` requiere `call_phone_number`
- `type = 'in_person'` requiere `location_id`
- `agent_id` es opcional para citas tipo 'call' (puede ser atendida por AI)
- La funcion `check_appointment_availability` verifica solapamiento
- Usar timezone del cliente para mostrar correctamente
