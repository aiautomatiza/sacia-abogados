# Schema Overview

Vision general del modelo de datos y diagrama ER.

## Diagrama Entidad-Relacion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE TABLES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     tenants      │
├──────────────────┤
│ id (PK)          │
│ name             │
│ email            │
│ status           │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    profiles      │     │   user_roles     │     │ user_invitations │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK/FK)       │────►│ user_id (FK)     │     │ id (PK)          │
│ email            │     │ role (enum)      │     │ email            │
│ tenant_id (FK)   │     │ created_at       │     │ tenant_id (FK)   │
│ created_at       │     └──────────────────┘     │ role             │
│ updated_at       │                              │ token            │
└──────────────────┘                              │ invited_by (FK)  │
                                                  │ status           │
                                                  └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CRM TABLES                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   crm_contacts   │     │  custom_fields   │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ tenant_id (FK)   │
│ numero (phone)   │     │ field_name       │
│ nombre           │     │ field_label      │
│ attributes (JSON)│◄────│ field_type       │
│ created_at       │     │ required         │
│ updated_at       │     │ options (JSON)   │
└────────┬─────────┘     │ display_order    │
         │               └──────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMMUNICATION TABLES                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  conversations   │────►│conversation_msgs │     │conversation_tags │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ conversation_id  │     │ tenant_id (FK)   │
│ contact_id (FK)  │     │ content          │     │ name             │
│ channel (enum)   │     │ content_type     │     │ color            │
│ status           │     │ sender_type      │     │ icon             │
│ assigned_to (FK) │     │ sender_id        │     │ is_system        │
│ tags (array)     │     │ delivery_status  │     └──────────────────┘
│ unread_count     │     │ file_url         │
│ last_message_at  │     │ file_type        │
│ last_message_prev│     │ created_at       │
│ whatsapp_24h_exp │     └──────────────────┘
└──────────────────┘

┌──────────────────┐
│    crm_calls     │
├──────────────────┤
│ id (PK)          │
│ tenant_id (FK)   │
│ contact_id (FK)  │
│ agent_id (FK)    │
│ type (enum)      │
│ state (enum)     │
│ call_datetime    │
│ duration_seconds │
│ transcript       │
│ summary          │
│ audio_url        │
│ call_sid         │
│ metadata (JSON)  │
└──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAMPAIGN TABLES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│    campaigns     │────►│  campaign_queue  │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ campaign_id (FK) │
│ channel          │     │ tenant_id (FK)   │
│ status           │     │ batch_number     │
│ total_contacts   │     │ total_batches    │
│ total_batches    │     │ contacts (JSON)  │
│ batches_sent     │     │ status           │
│ batches_failed   │     │ webhook_url      │
│ created_by (FK)  │     │ webhook_payload  │
│ completed_at     │     │ scheduled_for    │
└──────────────────┘     │ processed_at     │
                         │ error_message    │
                         └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPOINTMENT TABLES                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│  appointments    │     │ tenant_locations │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ tenant_id (FK)   │
│ type (enum)      │     │ name             │
│ contact_id (FK)  │◄────│ code             │
│ agent_id (FK)    │     │ address_line1    │
│ location_id (FK) │────►│ city             │
│ scheduled_at     │     │ country          │
│ duration_minutes │     │ latitude         │
│ timezone         │     │ longitude        │
│ status (enum)    │     │ phone            │
│ title            │     │ email            │
│ description      │     │ timezone         │
│ customer_notes   │     │ is_active        │
│ call_phone_number│     │ is_default       │
│ call_id (FK)     │     │ operating_hours  │
│ metadata (JSON)  │     └──────────────────┘
│ cancelled_reason │
└──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONFIGURATION TABLES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ tenant_settings  │     │tenant_credentials│     │    webhooks      │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ tenant_id (FK) 1:1     │ tenant_id (FK) 1:1     │ tenant_id (FK)   │
│ whatsapp_enabled │     │ whatsapp_cred    │     │ channel          │
│ whatsapp_webhook │     │ calls_cred       │     │ webhook          │
│ calls_enabled    │     │ conversations_cred     └──────────────────┘
│ calls_webhook    │     │ encryption_ver   │
│ calls_phone_num  │     └──────────────────┘
│ appointments_enab│
│ appointments_hook│
└──────────────────┘

┌──────────────────┐
│whatsapp_templates│
├──────────────────┤
│ id (PK)          │
│ tenant_id (FK)   │
│ template_id      │
│ name             │
│ language         │
│ category         │
│ status           │
│ header_text      │
│ body_text        │
│ footer_text      │
│ variables (JSON) │
└──────────────────┘
```

## Agrupacion por Dominio

### Core (Multi-tenant)

| Tabla | Proposito |
|-------|-----------|
| `tenants` | Organizaciones |
| `profiles` | Perfil de usuario vinculado a auth.users |
| `user_roles` | Roles de usuario (super_admin, user_client) |
| `user_invitations` | Invitaciones pendientes |

### CRM

| Tabla | Proposito |
|-------|-----------|
| `crm_contacts` | Contactos con numero, nombre y atributos |
| `custom_fields` | Definicion de campos personalizados por tenant |
| `contact_statuses` | Estados de contacto configurables |
| `contact_status_history` | Historial de cambios de estado |

### Comunicacion

| Tabla | Proposito |
|-------|-----------|
| `conversations` | Conversaciones por canal |
| `conversation_messages` | Mensajes de cada conversacion |
| `conversation_tags` | Etiquetas para categorizar |
| `whatsapp_templates` | Templates de WhatsApp Business |

### Llamadas

| Tabla | Proposito |
|-------|-----------|
| `crm_calls` | Registro de llamadas entrantes/salientes |

### Campanas

| Tabla | Proposito |
|-------|-----------|
| `campaigns` | Campanas de broadcast |
| `campaign_queue` | Cola de mensajes por batch |

### Citas

| Tabla | Proposito |
|-------|-----------|
| `appointments` | Citas programadas |
| `tenant_locations` | Sedes fisicas |

### Configuracion

| Tabla | Proposito |
|-------|-----------|
| `tenant_settings` | Configuracion general del tenant |
| `tenant_credentials` | Credenciales encriptadas |
| `webhooks` | URLs de webhook por canal |

### Integraciones

| Tabla | Proposito |
|-------|-----------|
| `integration_credentials` | Credenciales OAuth |
| `integration_sync_settings` | Configuracion de sync |
| `sync_logs` | Historial de sincronizaciones |

### Sistema

| Tabla | Proposito |
|-------|-----------|
| `ia_lock` | Lock para procesamiento AI |

## Vistas

| Vista | Proposito |
|-------|-----------|
| `v_crm_calls_detailed` | Calls con info de contacto y tenant |
| `v_appointments_detailed` | Appointments con info completa |

## Relaciones Clave

### Contact como Hub

```
crm_contacts
    │
    ├──► conversations (1:N)
    ├──► crm_calls (1:N)
    └──► appointments (1:N)
```

### Tenant como Raiz

```
tenants
    │
    ├──► profiles (1:N)
    ├──► crm_contacts (1:N)
    ├──► conversations (1:N)
    ├──► crm_calls (1:N)
    ├──► campaigns (1:N)
    ├──► appointments (1:N)
    ├──► tenant_locations (1:N)
    ├──► tenant_settings (1:1)
    ├──► tenant_credentials (1:1)
    └──► custom_fields (1:N)
```

## Siguiente Paso

Continua con [Tables Reference](./tables-reference.md) para el detalle de cada tabla.
