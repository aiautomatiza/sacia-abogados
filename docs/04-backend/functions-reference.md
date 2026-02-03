# Functions Reference

Listado completo de todas las Edge Functions del sistema.

## Resumen

| Funcion | Metodo | Auth | Descripcion |
|---------|--------|------|-------------|
| `api-gateway` | Multiple | JWT/API Key | Gateway REST centralizado |
| `complete-invitation` | POST | None | Completar invitacion |
| `create-contact` | POST | JWT | Crear contacto |
| `external-appointments-api` | Multiple | API Key | API externa de citas |
| `external-contact-api` | Multiple | API Key | API externa de contactos |
| `handle-oauth-callback` | POST | Service | Procesar callback OAuth |
| `import-contacts` | POST | JWT | Importar contactos masivo |
| `initiate-oauth` | POST | JWT | Iniciar flujo OAuth |
| `invite-user` | POST | JWT (Admin) | Invitar usuario |
| `manage-tenant-settings` | Multiple | JWT (Admin) | Gestionar settings |
| `manage-tenants` | Multiple | JWT (SuperAdmin) | CRUD de tenants |
| `migrate-credentials` | POST | Service | Migrar credenciales |
| `process-campaign-queue` | POST | Cron | Procesar cola campanas |
| `process-whatsapp-attachment` | POST | Service | Procesar adjuntos WA |
| `send-campaign` | POST | JWT | Crear campana |
| `send-conversation-message` | POST | JWT | Enviar mensaje |
| `send-template-message` | POST | JWT | Enviar template WA |
| `sync-contact-from-external` | POST | API Key | Sync contacto individual |
| `sync-contacts` | POST | JWT | Sync con integraciones |

## Detalle por Funcion

### api-gateway

**Proposito:** Gateway REST centralizado usando Hono framework.

```
POST /api-gateway/v1/contacts
POST /api-gateway/v1/appointments
POST /api-gateway/v1/admin/...
```

**Auth:** JWT o API Key segun endpoint

**Endpoints:**
- `/v1/contacts/*` - CRUD contactos
- `/v1/appointments/*` - CRUD citas
- `/v1/admin/*` - Operaciones admin

---

### complete-invitation

**Proposito:** Completar registro de usuario invitado.

```typescript
POST /complete-invitation
Body: {
  token: string,
  password: string
}
Response: {
  success: boolean,
  user: User
}
```

**Auth:** None (usa token de invitacion)

**Flujo:**
1. Valida token de invitacion
2. Crea usuario en Supabase Auth
3. Crea profile
4. Asigna rol
5. Marca invitacion como completada

---

### create-contact

**Proposito:** Crear contacto desde sistema externo.

```typescript
POST /create-contact
Body: {
  tenant_id: string,
  numero: string,
  nombre?: string,
  attributes?: object
}
Response: {
  contact: Contact
}
```

**Auth:** JWT

---

### external-appointments-api

**Proposito:** API publica para sistemas externos (ej: AI agent).

```typescript
// Crear cita
POST /external-appointments-api
Headers: {
  'x-tenant-id': string,
  'x-api-key': string
}
Body: {
  action: 'create',
  appointment: AppointmentData
}

// Listar citas
POST /external-appointments-api
Body: {
  action: 'list',
  filters: {...}
}

// Obtener disponibilidad
POST /external-appointments-api
Body: {
  action: 'availability',
  date: string,
  type: 'call' | 'in_person'
}
```

**Auth:** API Key por tenant

---

### external-contact-api

**Proposito:** API publica de contactos para integraciones.

```typescript
// Buscar contacto
POST /external-contact-api
Body: {
  action: 'find',
  numero: string
}

// Crear o actualizar
POST /external-contact-api
Body: {
  action: 'upsert',
  contact: ContactData
}

// Actualizar atributos
POST /external-contact-api
Body: {
  action: 'update-attributes',
  contact_id: string,
  attributes: object
}
```

**Auth:** API Key por tenant

---

### handle-oauth-callback

**Proposito:** Procesar callback de OAuth (llamado por middleware).

```typescript
POST /handle-oauth-callback
Body: {
  tenant_id: string,
  integration_name: string,
  access_token: string,
  refresh_token: string,
  expires_in: number,
  provider_user_id: string,
  provider_account_name: string,
  scopes: string[]
}
```

**Auth:** Service key (solo middleware)

---

### import-contacts

**Proposito:** Importar multiples contactos desde CSV/Excel.

```typescript
POST /import-contacts
Body: {
  tenant_id: string,
  contacts: ContactData[]
}
Response: {
  imported: number,
  errors: Error[]
}
```

**Auth:** JWT

---

### initiate-oauth

**Proposito:** Iniciar flujo OAuth con proveedor externo.

```typescript
POST /initiate-oauth
Body: {
  integration_name: 'zoho' | 'pipedrive' | ...,
  tenant_id: string
}
Response: {
  authorization_url: string,
  state: string
}
```

**Auth:** JWT

---

### invite-user

**Proposito:** Enviar invitacion a nuevo usuario.

```typescript
POST /invite-user
Body: {
  email: string,
  full_name: string,
  role: 'user_client' | 'super_admin',
  tenant_id?: string
}
Response: {
  invitation: Invitation
}
```

**Auth:** JWT (Admin o SuperAdmin)

---

### manage-tenant-settings

**Proposito:** Gestionar configuracion de tenant.

```typescript
// Obtener settings
GET /manage-tenant-settings?tenant_id=xxx

// Actualizar settings
POST /manage-tenant-settings
Body: {
  tenant_id: string,
  whatsapp_enabled: boolean,
  calls_enabled: boolean,
  ...
}
```

**Auth:** JWT (Admin del tenant o SuperAdmin)

---

### manage-tenants

**Proposito:** CRUD de tenants (solo super_admin).

```typescript
// Listar tenants
GET /manage-tenants

// Crear tenant
POST /manage-tenants
Body: { name: string, email: string }

// Actualizar tenant
PUT /manage-tenants
Body: { id: string, ...updates }

// Eliminar tenant
DELETE /manage-tenants?id=xxx
```

**Auth:** JWT (SuperAdmin)

---

### process-campaign-queue

**Proposito:** Procesar batches de campanas (cron job).

```typescript
POST /process-campaign-queue
// Llamado automaticamente por cron
// Procesa batches pendientes cuyo scheduled_for <= NOW()
```

**Auth:** Cron (Supabase interno)

---

### send-campaign

**Proposito:** Crear campana y encolar batches.

```typescript
POST /send-campaign
Body: {
  tenant_id: string,
  channel: 'whatsapp' | 'calls',
  contacts: ContactData[],
  webhook_url: string,
  webhook_payload: object
}
Response: {
  campaign: Campaign,
  batches_queued: number
}
```

**Auth:** JWT

---

### send-conversation-message

**Proposito:** Enviar mensaje en conversacion existente.

```typescript
POST /send-conversation-message
Body: {
  conversation_id: string,
  content: string,
  content_type: 'text' | 'audio' | 'image' | ...,
  file_url?: string
}
Response: {
  message: Message
}
```

**Auth:** JWT

---

### send-template-message

**Proposito:** Enviar template de WhatsApp (fuera de ventana 24h).

```typescript
POST /send-template-message
Body: {
  conversation_id: string,
  template_id: string,
  variables: Record<string, string>
}
Response: {
  message: Message
}
```

**Auth:** JWT

---

### sync-contact-from-external

**Proposito:** Sincronizar contacto individual desde sistema externo.

```typescript
POST /sync-contact-from-external
Headers: {
  'x-tenant-id': string,
  'x-api-key': string
}
Body: {
  external_id: string,
  contact: ContactData
}
```

**Auth:** API Key

---

### sync-contacts

**Proposito:** Sincronizar contactos con integracion OAuth.

```typescript
POST /sync-contacts
Body: {
  integration_id: string,
  filters?: object
}
Response: {
  synced: number,
  errors: Error[]
}
```

**Auth:** JWT

## Codigos de Error Comunes

| Codigo | Significado |
|--------|-------------|
| 400 | Bad Request - Parametros invalidos |
| 401 | Unauthorized - Sin autenticacion |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no existe |
| 409 | Conflict - Duplicado |
| 500 | Internal Error - Error de servidor |

## Siguiente Paso

Continua con [Shared Utilities](./shared-utilities.md) para ver el codigo compartido.
