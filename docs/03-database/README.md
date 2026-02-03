# Base de Datos

Documentacion del modelo de datos PostgreSQL.

## Contenido

1. [Schema Overview](./schema-overview.md) - Diagrama ER y vision general
2. [Tables Reference](./tables-reference.md) - Referencia de todas las tablas
3. [RLS Policies](./rls-policies.md) - Politicas de seguridad
4. [Functions & Triggers](./functions-triggers.md) - Funciones SQL
5. [Migrations Guide](./migrations-guide.md) - Como crear migraciones

## Schemas por Tabla

Documentacion detallada de tablas criticas:

| Tabla | Descripcion | Documento |
|-------|-------------|-----------|
| `tenants` | Organizaciones | [tenants.md](./schemas/tenants.md) |
| `profiles` | Perfiles de usuario | [profiles.md](./schemas/profiles.md) |
| `crm_contacts` | Contactos CRM | [crm-contacts.md](./schemas/crm-contacts.md) |
| `conversations` | Conversaciones | [conversations.md](./schemas/conversations.md) |
| `crm_calls` | Llamadas | [crm-calls.md](./schemas/crm-calls.md) |
| `campaigns` | Campanas | [campaigns.md](./schemas/campaigns.md) |
| `appointments` | Citas | [appointments.md](./schemas/appointments.md) |

## Quick Reference

### Tablas Principales

| Dominio | Tablas |
|---------|--------|
| **Multi-tenant** | `tenants`, `profiles`, `user_roles`, `user_invitations` |
| **CRM** | `crm_contacts`, `custom_fields` |
| **Comunicacion** | `conversations`, `conversation_messages`, `conversation_tags` |
| **Llamadas** | `crm_calls` |
| **Campanas** | `campaigns`, `campaign_queue` |
| **Citas** | `appointments`, `tenant_locations` |
| **Configuracion** | `tenant_settings`, `tenant_credentials`, `webhooks` |
| **Integraciones** | `integration_credentials`, `sync_logs`, `whatsapp_templates` |

### Enums

```sql
-- Roles de usuario
app_role: 'user_client' | 'super_admin'

-- Tipos de cita
appointment_type: 'call' | 'in_person'

-- Estados de cita
appointment_status: 'scheduled' | 'confirmed' | 'in_progress' |
                    'completed' | 'cancelled' | 'no_show' | 'rescheduled'

-- Estados de llamada
call_state: 'pending' | 'completed' | 'failed' |
            'missed' | 'voicemail' | 'user_hangup' | 'scheduled'

-- Tipo de llamada
call_type: 'inbound' | 'outbound'

-- Canales de conversacion
conversation_channel: 'whatsapp' | 'instagram' | 'webchat' | 'email'

-- Estado de conversacion
conversation_status: 'active' | 'archived'

-- Tipos de contenido de mensaje
message_content_type: 'text' | 'audio' | 'image' | 'document' |
                      'video' | 'location' | 'sticker'

-- Estado de entrega
message_delivery_status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

-- Tipo de sender
message_sender_type: 'contact' | 'agent' | 'system' | 'ai'
```

## Diagrama ER Simplificado

```
┌──────────────┐       ┌──────────────┐
│   tenants    │       │   profiles   │
├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ tenant_id(FK)│
│ name         │       │ id (PK)      │
│ email        │       │ email        │
│ status       │       └──────────────┘
└──────────────┘              │
       │                      │
       │                      ▼
       │               ┌──────────────┐
       │               │  user_roles  │
       │               ├──────────────┤
       │               │ user_id (FK) │
       │               │ role         │
       │               └──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    TABLAS CON tenant_id                       │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ crm_contacts │conversations │  crm_calls   │   campaigns     │
│ appointments │tenant_settings│custom_fields│ campaign_queue  │
│tenant_locations│webhooks     │conversation_tags│whatsapp_templates│
└──────────────┴──────────────┴──────────────┴─────────────────┘
```

## Patron Multi-Tenant

Todas las tablas de datos de negocio tienen:

```sql
tenant_id UUID NOT NULL REFERENCES tenants(id)
```

Y politicas RLS que filtran por tenant.

## Tipos TypeScript

Los tipos se generan automaticamente desde el schema en:

```
src/integrations/supabase/types.ts
```

Uso:

```typescript
import type { Database } from '@/integrations/supabase/types';

// Tipo de fila
type Contact = Database['public']['Tables']['crm_contacts']['Row'];

// Tipo para insert
type ContactInsert = Database['public']['Tables']['crm_contacts']['Insert'];

// Tipo para update
type ContactUpdate = Database['public']['Tables']['crm_contacts']['Update'];

// Enums
type CallState = Database['public']['Enums']['call_state'];
```

## Siguiente Paso

Continua con [Schema Overview](./schema-overview.md) para el diagrama ER completo.
