# REST Endpoints

API Gateway endpoints para operaciones complejas.

## Base URL

```
https://<project>.supabase.co/functions/v1/api-gateway
```

## Autenticación

### JWT Token (Frontend)

```typescript
const { data } = await supabase.functions.invoke('api-gateway', {
  body: { action: 'contacts.list' },
});
// Token se incluye automáticamente
```

### API Key (External)

```bash
curl -X POST "$BASE_URL/contacts" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-uuid" \
  -H "x-api-key: your-api-key" \
  -d '{"name": "John Doe", "phone": "+1234567890"}'
```

## Contacts

### List Contacts

```
GET /contacts
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Página (default: 1) |
| `limit` | number | Por página (default: 50) |
| `search` | string | Buscar en nombre/teléfono |
| `status` | string | Filtrar por status |
| `tags` | string | IDs de tags separados por coma |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "numero": "+521234567890",
      "email": "juan@example.com",
      "status": "active",
      "attributes": {},
      "tags": ["tag-id-1"],
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Get Contact

```
GET /contacts/:id
```

**Response:**
```json
{
  "id": "uuid",
  "nombre": "Juan Pérez",
  "numero": "+521234567890",
  "email": "juan@example.com",
  "status": "active",
  "attributes": {
    "company": "ACME Inc",
    "position": "Manager"
  },
  "tags": [
    { "id": "tag-id", "name": "VIP", "color": "#ff0000" }
  ],
  "conversations": [
    { "id": "conv-id", "channel": "whatsapp", "last_message_at": "..." }
  ],
  "appointments": [
    { "id": "apt-id", "scheduled_at": "...", "status": "scheduled" }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-16T15:30:00Z"
}
```

### Create Contact

```
POST /contacts
```

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "numero": "+521234567890",
  "email": "juan@example.com",
  "attributes": {
    "company": "ACME Inc"
  },
  "tags": ["tag-id-1", "tag-id-2"]
}
```

**Response:** `201 Created`
```json
{
  "id": "new-uuid",
  "nombre": "Juan Pérez",
  "numero": "+521234567890",
  ...
}
```

### Update Contact

```
PUT /contacts/:id
```

**Body:**
```json
{
  "nombre": "Juan Pérez Updated",
  "attributes": {
    "company": "New Company"
  }
}
```

### Delete Contact

```
DELETE /contacts/:id
```

**Response:** `204 No Content`

### Bulk Delete Contacts

```
POST /contacts/bulk-delete
```

**Body:**
```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

## Appointments

### List Appointments

```
GET /appointments
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Página |
| `limit` | number | Por página |
| `status` | string | scheduled, confirmed, completed, cancelled |
| `type` | string | call, in_person |
| `date_from` | string | Fecha inicio (ISO) |
| `date_to` | string | Fecha fin (ISO) |
| `agent_id` | string | Filtrar por agente |
| `location_id` | string | Filtrar por sede |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "contact": {
        "id": "contact-id",
        "nombre": "Juan Pérez",
        "numero": "+521234567890"
      },
      "type": "call",
      "status": "scheduled",
      "scheduled_at": "2024-01-20T10:00:00Z",
      "duration_minutes": 30,
      "agent": {
        "id": "agent-id",
        "full_name": "María García"
      },
      "location": null,
      "notes": "Primera consulta",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Create Appointment

```
POST /appointments
```

**Body:**
```json
{
  "contact_id": "contact-uuid",
  "type": "call",
  "scheduled_at": "2024-01-20T10:00:00Z",
  "duration_minutes": 30,
  "agent_id": "agent-uuid",
  "location_id": null,
  "notes": "Primera consulta"
}
```

### Update Appointment

```
PUT /appointments/:id
```

**Body:**
```json
{
  "status": "confirmed",
  "scheduled_at": "2024-01-20T11:00:00Z"
}
```

### Cancel Appointment

```
POST /appointments/:id/cancel
```

**Body:**
```json
{
  "reason": "Cliente solicitó cancelación"
}
```

### Check Availability

```
POST /appointments/check-availability
```

**Body:**
```json
{
  "type": "call",
  "scheduled_at": "2024-01-20T10:00:00Z",
  "duration_minutes": 30,
  "agent_id": "agent-uuid",
  "location_id": null
}
```

**Response:**
```json
{
  "available": true
}
```

## Conversations

### List Conversations

```
GET /conversations
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Página |
| `channel` | string | whatsapp, instagram, webchat, email |
| `status` | string | active, archived |
| `assigned_to` | string | Agent UUID |
| `tags` | string | Tag IDs |

### Get Conversation Messages

```
GET /conversations/:id/messages
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Mensajes a obtener |
| `before` | string | Cursor para paginación |

### Send Message

```
POST /conversations/:id/messages
```

**Body (Text):**
```json
{
  "type": "text",
  "content": "Hola, ¿cómo puedo ayudarte?"
}
```

**Body (Template):**
```json
{
  "type": "template",
  "template_name": "appointment_reminder",
  "template_params": ["Juan", "20 de enero, 10:00"]
}
```

### Assign Conversation

```
POST /conversations/:id/assign
```

**Body:**
```json
{
  "agent_id": "agent-uuid"
}
```

### Archive Conversation

```
POST /conversations/:id/archive
```

## Campaigns

### Create Campaign

```
POST /campaigns
```

**Body:**
```json
{
  "name": "Campaña Enero",
  "type": "whatsapp",
  "template_name": "promo_enero",
  "template_params": {},
  "contacts": ["contact-id-1", "contact-id-2"],
  "scheduled_at": "2024-01-15T09:00:00Z"
}
```

### Cancel Campaign

```
POST /campaigns/:id/cancel
```

## Calls

### List Calls

```
GET /calls
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Página |
| `direction` | string | inbound, outbound |
| `state` | string | completed, missed, failed |
| `agent_id` | string | Filtrar por agente |
| `date_from` | string | Fecha inicio |
| `date_to` | string | Fecha fin |

### Initiate Call

```
POST /calls/initiate
```

**Body:**
```json
{
  "to": "+521234567890",
  "contact_id": "contact-uuid",
  "agent_id": "agent-uuid"
}
```

## Admin (Super Admin Only)

### List Tenants

```
GET /admin/tenants
```

### Create Tenant

```
POST /admin/tenants
```

**Body:**
```json
{
  "name": "Nueva Empresa",
  "slug": "nueva-empresa",
  "settings": {
    "max_users": 10
  }
}
```

### Get Tenant

```
GET /admin/tenants/:id
```

### Update Tenant

```
PUT /admin/tenants/:id
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number is required",
    "details": {
      "field": "numero",
      "constraint": "required"
    }
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate or conflict |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General | 100 req/min |
| Bulk operations | 10 req/min |
| Send message | 30 req/min |

## Webhooks (Outgoing)

Configurar webhook URL en tenant settings para recibir eventos:

```json
{
  "event": "contact.created",
  "data": {
    "id": "uuid",
    "nombre": "...",
    ...
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "tenant_id": "tenant-uuid"
}
```

### Events

- `contact.created`
- `contact.updated`
- `contact.deleted`
- `appointment.created`
- `appointment.updated`
- `appointment.cancelled`
- `message.received`
- `call.completed`
