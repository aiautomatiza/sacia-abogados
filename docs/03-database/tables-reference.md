# Tables Reference

Referencia rapida de todas las tablas del sistema.

## Tablas Core

### tenants

Organizaciones/empresas del sistema.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `name` | TEXT | NO | Nombre del tenant |
| `email` | TEXT | SI | Email de contacto |
| `status` | TEXT | SI | 'active', 'inactive' |
| `created_at` | TIMESTAMP | SI | Fecha creacion |
| `updated_at` | TIMESTAMP | SI | Ultima actualizacion |

### profiles

Perfiles de usuario vinculados a auth.users.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK, FK a auth.users |
| `email` | TEXT | NO | Email del usuario |
| `tenant_id` | UUID | SI | FK a tenants |
| `created_at` | TIMESTAMP | NO | Fecha creacion |
| `updated_at` | TIMESTAMP | NO | Ultima actualizacion |

### user_roles

Roles asignados a usuarios.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `user_id` | UUID | NO | FK a auth.users |
| `role` | app_role | NO | 'user_client' o 'super_admin' |
| `created_at` | TIMESTAMP | SI | Fecha creacion |

### user_invitations

Invitaciones pendientes de aceptar.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `email` | TEXT | NO | Email invitado |
| `full_name` | TEXT | NO | Nombre completo |
| `role` | app_role | NO | Rol asignado |
| `tenant_id` | UUID | SI | FK a tenants |
| `invited_by` | UUID | NO | FK a auth.users |
| `token` | TEXT | NO | Token unico |
| `status` | TEXT | SI | 'pending', 'completed', 'expired' |
| `expires_at` | TIMESTAMP | SI | Fecha expiracion |
| `completed_at` | TIMESTAMP | SI | Fecha completado |
| `user_id` | UUID | SI | Usuario creado |

## Tablas CRM

### crm_contacts

Contactos del CRM.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `numero` | TEXT | NO | Numero de telefono |
| `nombre` | TEXT | SI | Nombre del contacto |
| `attributes` | JSON | SI | Campos personalizados |
| `created_at` | TIMESTAMP | NO | Fecha creacion |
| `updated_at` | TIMESTAMP | NO | Ultima actualizacion |

### custom_fields

Definicion de campos personalizados por tenant.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `field_name` | TEXT | NO | Nombre interno |
| `field_label` | TEXT | NO | Label visible |
| `field_type` | TEXT | NO | 'text', 'select', 'date', etc |
| `required` | BOOLEAN | SI | Es requerido |
| `options` | JSON | SI | Opciones para select |
| `display_order` | INT | SI | Orden de display |

## Tablas de Comunicacion

### conversations

Conversaciones con contactos.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `contact_id` | UUID | NO | FK a crm_contacts |
| `channel` | conversation_channel | NO | Canal de comunicacion |
| `status` | conversation_status | NO | 'active' o 'archived' |
| `assigned_to` | UUID | SI | FK a profiles |
| `tags` | TEXT[] | SI | Array de tags |
| `unread_count` | INT | NO | Mensajes sin leer |
| `last_message_at` | TIMESTAMP | SI | Ultimo mensaje |
| `last_message_preview` | TEXT | SI | Preview del mensaje |
| `whatsapp_24h_window_expires_at` | TIMESTAMP | SI | Expiracion ventana 24h |
| `ai_conversation_id` | TEXT | SI | ID de conversacion AI |
| `state` | TEXT | SI | Estado de la conversacion |
| `pending_agent_response` | BOOLEAN | SI | Esperando respuesta |
| `metadata` | JSON | SI | Metadatos adicionales |

### conversation_messages

Mensajes de conversaciones.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `conversation_id` | UUID | NO | FK a conversations |
| `content` | TEXT | SI | Contenido del mensaje |
| `content_type` | message_content_type | NO | Tipo de contenido |
| `sender_type` | message_sender_type | NO | Quien envia |
| `sender_id` | UUID | SI | ID del sender |
| `delivery_status` | message_delivery_status | NO | Estado de entrega |
| `file_url` | TEXT | SI | URL de archivo |
| `file_type` | TEXT | SI | MIME type |
| `file_name` | TEXT | SI | Nombre de archivo |
| `file_size` | INT | SI | Tamano en bytes |
| `external_message_id` | TEXT | SI | ID externo |
| `replied_to_message_id` | UUID | SI | Mensaje respondido |
| `error_message` | TEXT | SI | Error si fallo |
| `message_state` | message_state_enum | SI | Estado de procesamiento |
| `metadata` | JSON | SI | Metadatos |

### conversation_tags

Etiquetas para conversaciones.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `name` | TEXT | NO | Nombre del tag |
| `color` | TEXT | NO | Color hex |
| `icon` | TEXT | SI | Icono |
| `is_system` | BOOLEAN | NO | Es tag del sistema |

## Tablas de Llamadas

### crm_calls

Registro de llamadas.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `contact_id` | UUID | NO | FK a crm_contacts |
| `agent_id` | UUID | SI | FK a profiles |
| `type` | call_type | NO | 'inbound' o 'outbound' |
| `state` | call_state | NO | Estado de la llamada |
| `call_datetime` | TIMESTAMP | NO | Fecha/hora |
| `duration_seconds` | INT | SI | Duracion |
| `audio_duration_seconds` | INT | SI | Duracion audio |
| `transcript` | TEXT | SI | Transcripcion |
| `summary` | TEXT | SI | Resumen |
| `audio_url` | TEXT | SI | URL del audio |
| `call_sid` | TEXT | SI | SID de Twilio |
| `end_reason` | TEXT | SI | Razon de fin |
| `metadata` | JSON | SI | Metadatos |

## Tablas de Campanas

### campaigns

Campanas de broadcast.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `channel` | TEXT | NO | Canal ('whatsapp', 'calls') |
| `status` | TEXT | NO | 'pending', 'in_progress', 'completed', 'failed' |
| `total_contacts` | INT | NO | Total de contactos |
| `total_batches` | INT | NO | Total de batches |
| `batches_sent` | INT | SI | Batches enviados |
| `batches_failed` | INT | SI | Batches fallidos |
| `created_by` | UUID | SI | FK a profiles |
| `completed_at` | TIMESTAMP | SI | Fecha completado |

### campaign_queue

Cola de procesamiento de campanas.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `campaign_id` | UUID | NO | FK a campaigns |
| `tenant_id` | UUID | NO | FK a tenants |
| `batch_number` | INT | NO | Numero de batch |
| `total_batches` | INT | NO | Total batches |
| `channel` | TEXT | NO | Canal |
| `contacts` | JSON | NO | Array de contactos |
| `status` | TEXT | NO | Estado del batch |
| `webhook_url` | TEXT | NO | URL de webhook |
| `webhook_payload` | JSON | NO | Payload base |
| `scheduled_for` | TIMESTAMP | NO | Fecha programada |
| `processed_at` | TIMESTAMP | SI | Fecha procesado |
| `error_message` | TEXT | SI | Error si fallo |
| `retry_count` | INT | SI | Reintentos |

## Tablas de Citas

### appointments

Citas programadas.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `type` | appointment_type | NO | 'call' o 'in_person' |
| `contact_id` | UUID | NO | FK a crm_contacts |
| `agent_id` | UUID | SI | FK a profiles |
| `location_id` | UUID | SI | FK a tenant_locations |
| `scheduled_at` | TIMESTAMP | NO | Fecha/hora |
| `duration_minutes` | INT | NO | Duracion |
| `timezone` | TEXT | NO | Timezone |
| `status` | appointment_status | NO | Estado |
| `title` | TEXT | SI | Titulo |
| `description` | TEXT | SI | Descripcion |
| `customer_notes` | TEXT | SI | Notas del cliente |
| `call_phone_number` | TEXT | SI | Telefono para llamada |
| `call_id` | UUID | SI | FK a crm_calls |
| `reminder_sent_at` | TIMESTAMP | SI | Recordatorio enviado |
| `confirmation_sent_at` | TIMESTAMP | SI | Confirmacion enviada |
| `cancelled_at` | TIMESTAMP | SI | Fecha cancelacion |
| `cancelled_reason` | TEXT | SI | Razon cancelacion |
| `metadata` | JSON | NO | Metadatos |
| `created_by` | UUID | SI | FK a profiles |

### tenant_locations

Sedes fisicas.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `name` | TEXT | NO | Nombre |
| `code` | TEXT | SI | Codigo interno |
| `address_line1` | TEXT | NO | Direccion linea 1 |
| `address_line2` | TEXT | SI | Direccion linea 2 |
| `city` | TEXT | NO | Ciudad |
| `state_province` | TEXT | SI | Estado/Provincia |
| `postal_code` | TEXT | SI | Codigo postal |
| `country` | TEXT | NO | Pais |
| `latitude` | FLOAT | SI | Latitud |
| `longitude` | FLOAT | SI | Longitud |
| `phone` | TEXT | SI | Telefono |
| `email` | TEXT | SI | Email |
| `timezone` | TEXT | NO | Timezone |
| `is_active` | BOOLEAN | NO | Esta activa |
| `is_default` | BOOLEAN | NO | Es default |
| `operating_hours` | JSON | NO | Horario |
| `metadata` | JSON | NO | Metadatos |

## Tablas de Configuracion

### tenant_settings

Configuracion del tenant.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants (1:1) |
| `whatsapp_enabled` | BOOLEAN | SI | WhatsApp habilitado |
| `whatsapp_webhook_url` | TEXT | SI | Webhook WhatsApp |
| `calls_enabled` | BOOLEAN | SI | Llamadas habilitadas |
| `calls_webhook_url` | TEXT | SI | Webhook llamadas |
| `calls_phone_number` | TEXT | SI | Numero de telefono |
| `appointments_enabled` | BOOLEAN | SI | Citas habilitadas |
| `appointments_webhook_url` | TEXT | SI | Webhook citas |

### tenant_credentials

Credenciales encriptadas.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants (1:1) |
| `whatsapp_credential` | TEXT | SI | Credencial WhatsApp |
| `calls_credential` | TEXT | SI | Credencial llamadas |
| `conversations_credential` | TEXT | SI | Credencial conversaciones |
| `encryption_version` | INT | SI | Version de encriptacion |

### webhooks

URLs de webhook por canal.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | INT | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `channel` | TEXT | NO | Canal |
| `webhook` | TEXT | NO | URL |

### whatsapp_templates

Templates de WhatsApp Business.

| Columna | Tipo | Nullable | Descripcion |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | FK a tenants |
| `template_id` | TEXT | NO | ID en Meta |
| `name` | TEXT | NO | Nombre |
| `language` | TEXT | NO | Idioma |
| `category` | TEXT | NO | Categoria |
| `status` | TEXT | NO | Estado de aprobacion |
| `header_text` | TEXT | SI | Header |
| `body_text` | TEXT | NO | Body |
| `footer_text` | TEXT | SI | Footer |
| `variables` | JSON | SI | Variables |

## Siguiente Paso

Continua con [RLS Policies](./rls-policies.md) para ver las politicas de seguridad.
