# Arquitectura de Sincronización de Contactos

## Problema a Resolver

Existen 3 formas en que un contacto puede llegar al dashboard, y cada una requiere un tratamiento diferente respecto a la sincronización con integraciones externas (ej: Pipedrive):

1. **Desde Pipedrive (vía n8n) → Dashboard**: NO debe reenviarse a Pipedrive (evitar loop)
2. **Desde UI Dashboard → Pipedrive**: SÍ debe sincronizarse si la integración está activa
3. **Desde n8n (otras fuentes) → Dashboard**: SÍ debe sincronizarse si la integración está activa

## Solución: Sistema de Edge Functions con Lógica de Enrutamiento

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                        FUENTES DE CONTACTOS                       │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           │                    │                    │
    [UI Dashboard]      [n8n - Pipedrive]    [n8n - Otras fuentes]
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐    ┌──────────────────┐  ┌─────────────┐
    │create-contact│    │sync-from-external│  │create-contact│
    │ (edge func)  │    │   (edge func)    │  │ + flag      │
    └──────┬───────┘    └────────┬─────────┘  └──────┬──────┘
           │                     │                    │
           │                     │                    │
           ▼                     ▼                    ▼
    ┌──────────────────────────────────────────────────────┐
    │          INSERT INTO crm_contacts (Supabase)         │
    └──────────────────────────────────────────────────────┘
           │                     │                    │
           │                     │                    │
           ▼                     ▼                    ▼
    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
    │ Revisa si    │    │ NO notifica    │    │ Revisa si    │
    │ integración  │    │ middleware     │    │ integración  │
    │ está activa  │    │ (evita loop)   │    │ está activa  │
    └──────┬───────┘    └────────────────┘    └──────┬───────┘
           │                                          │
           ▼                                          ▼
    ┌──────────────┐                          ┌──────────────┐
    │ Notifica     │                          │ Notifica     │
    │ Middleware   │                          │ Middleware   │
    └──────────────┘                          └──────────────┘
           │                                          │
           ▼                                          ▼
    ┌──────────────────────────────────────────────────────┐
    │         Middleware → Pipedrive (si activo)           │
    └──────────────────────────────────────────────────────┘
```

## Implementación Detallada

### 1. Edge Function: `create-contact` (YA EXISTE - MODIFICAR)

**Uso:** Creación desde UI Dashboard y desde n8n (otras fuentes)

**Ubicación:** `supabase/functions/create-contact/index.ts`

**Cambios necesarios:**
- Añadir parámetro opcional: `skip_external_sync` (boolean, default: false)
- Consultar tabla `integration_credentials` para verificar integraciones activas
- Solo notificar al middleware si:
  - `skip_external_sync === false`
  - Y existe al menos una integración `status='active'` para el tenant

**Request body:**
```typescript
{
  numero: string;
  nombre?: string;
  attributes?: Record<string, any>;
  skip_external_sync?: boolean; // Nuevo campo
}
```

**Lógica de decisión:**
```typescript
// 1. Crear contacto en DB
const contact = await createInDatabase(...);

// 2. Verificar si debe sincronizar
if (!skip_external_sync) {
  const hasActiveIntegrations = await checkActiveIntegrations(tenant_id);

  if (hasActiveIntegrations) {
    await notifyMiddleware({
      tenant_id,
      contact,
      event: 'contact.created'
    });
  }
}
```

**Helper function para verificar integraciones:**
```typescript
async function checkActiveIntegrations(tenantId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('integration_credentials')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1);

  return (data?.length ?? 0) > 0;
}
```

---

### 2. Edge Function: `sync-contact-from-external` (NUEVA)

**Uso:** Cuando un contacto proviene de una integración externa (Pipedrive, Zoho, etc.)

**Ubicación:** `supabase/functions/sync-contact-from-external/index.ts`

**Características:**
- **NO** notifica al middleware (evita loops)
- Usa autenticación via `X-JWT-Secret` (como en otras sync functions)
- Soporta upsert (create or update)
- Normaliza números de teléfono
- Registra metadata de sincronización

**Request body:**
```typescript
{
  tenant_id: string;
  integration_name: string; // ej: "pipedrive"
  contacts: Array<{
    external_id: string; // ID en el sistema externo
    numero: string;
    nombre?: string;
    attributes?: Record<string, any>;
  }>;
}
```

**Lógica:**
```typescript
// 1. Verificar autenticación JWT
const jwtSecret = req.headers.get('X-JWT-Secret');
if (jwtSecret !== Deno.env.get('JWT_SECRET')) {
  return 401;
}

// 2. Validar que la integración existe y está activa
const integration = await validateIntegration(tenant_id, integration_name);

// 3. Para cada contacto: upsert
for (const contact of contacts) {
  const normalized = normalizePhone(contact.numero);

  // Añadir metadata del origen
  const enrichedAttributes = {
    ...contact.attributes,
    _sync_metadata: {
      source: integration_name,
      external_id: contact.external_id,
      synced_at: new Date().toISOString()
    }
  };

  // Upsert: ON CONFLICT DO UPDATE
  await supabaseAdmin
    .from('crm_contacts')
    .upsert({
      tenant_id,
      numero: normalized,
      nombre: contact.nombre,
      attributes: enrichedAttributes
    }, {
      onConflict: 'tenant_id,numero',
      ignoreDuplicates: false
    });
}

// 4. NO llamar al middleware
```

**Seguridad:**
- Solo accesible con `X-JWT-Secret` correcto
- Valida que `integration_name` exista en `integration_credentials`
- RLS aplicado en queries

---

### 3. Actualización: `import-contacts` (MODIFICAR)

**Cambios necesarios:**
- Añadir la misma lógica de verificación de integraciones activas
- Si el tenant tiene integraciones activas, notificar al middleware
- Mantener compatibilidad con importación CSV

**Ubicación:** `supabase/functions/import-contacts/index.ts`

**Lógica a añadir:**
```typescript
// Después de importar todos los contactos
const hasActiveIntegrations = await checkActiveIntegrations(profile.tenant_id);

if (hasActiveIntegrations && contactIds.length > 0) {
  // Obtener contactos recién creados/actualizados
  const { data: contacts } = await supabaseClient
    .from('crm_contacts')
    .select('*')
    .in('id', contactIds);

  // Notificar al middleware en batch
  await notifyMiddleware({
    tenant_id: profile.tenant_id,
    contacts,
    event: 'contacts.bulk_imported'
  });
}
```

---

## Tabla de Decisión: ¿Cuándo notificar al middleware?

| Origen                | Edge Function                | Skip Sync? | Verifica Integración? | Notifica Middleware? |
|-----------------------|------------------------------|------------|-----------------------|----------------------|
| UI Dashboard          | `create-contact`             | No         | Sí                    | ✅ Si activa         |
| n8n (Pipedrive)       | `sync-contact-from-external` | -          | No                    | ❌ Nunca             |
| n8n (Otras fuentes)   | `create-contact`             | No         | Sí                    | ✅ Si activa         |
| CSV Import            | `import-contacts`            | -          | Sí                    | ✅ Si activa         |

---

## Flujo por Caso de Uso

### Caso 1: Desde Pipedrive → Dashboard (Usuario gestiona vía n8n)

```
Pipedrive (nuevo contacto)
    ↓
n8n webhook trigger
    ↓
n8n workflow transforma datos
    ↓
POST /supabase/functions/v1/sync-contact-from-external
Headers: { X-JWT-Secret: "xxx" }
Body: {
  tenant_id: "...",
  integration_name: "pipedrive",
  contacts: [{
    external_id: "pd_123",
    numero: "+34612345678",
    nombre: "Juan Pérez"
  }]
}
    ↓
Edge function:
  1. Valida JWT
  2. Valida integración activa
  3. Upsert en crm_contacts
  4. NO notifica middleware
    ↓
Contacto en Dashboard ✅
```

**Instrucciones para n8n:**
- Webhook: Escuchar eventos de Pipedrive (`person.created`, `person.updated`)
- Transform: Mapear campos de Pipedrive a formato Dashboard
- HTTP Request: POST a edge function con header `X-JWT-Secret`

---

### Caso 2: Desde UI Dashboard → Pipedrive

```
Usuario crea contacto en Dashboard
    ↓
Frontend: createContact.mutate({ numero, nombre })
    ↓
contact.service.ts → supabase.functions.invoke('create-contact')
    ↓
Edge function create-contact:
  1. Crea contacto en DB
  2. Verifica integraciones activas del tenant
  3. Si tiene Pipedrive activo:
     → Notifica middleware
    ↓
Middleware:
  1. Recibe evento
  2. Consulta integration_credentials
  3. Envía a Pipedrive API
    ↓
Contacto creado en Pipedrive ✅
```

**Flujo automático** - Sin configuración adicional en n8n

---

### Caso 3: Desde n8n (otras fuentes) → Dashboard

```
n8n workflow (ej: Google Sheets, Typeform, API externa)
    ↓
n8n procesa datos
    ↓
POST /supabase/functions/v1/create-contact
Headers: { Authorization: "Bearer <supabase-anon-key>" }
Body: {
  numero: "+34612345678",
  nombre: "María López"
}
    ↓
Edge function create-contact:
  1. Crea contacto en DB
  2. Verifica integraciones activas
  3. Si tiene Pipedrive activo:
     → Notifica middleware
    ↓
Middleware → Pipedrive ✅
```

**Alternativa con skip sync:**
Si NO quieres sincronizar con Pipedrive desde esta fuente:
```json
{
  "numero": "+34612345678",
  "nombre": "María López",
  "skip_external_sync": true
}
```

---

## Metadata de Sincronización

Para trackear el origen de cada contacto, usamos el campo `attributes._sync_metadata`:

```typescript
{
  "attributes": {
    // Campos custom del usuario
    "empresa": "Acme Corp",
    "sector": "tecnología",

    // Metadata de sincronización (añadida automáticamente)
    "_sync_metadata": {
      "source": "pipedrive",           // Origen
      "external_id": "pd_12345",       // ID en sistema externo
      "synced_at": "2026-01-07T10:30:00Z",
      "last_sync_direction": "inbound" // inbound | outbound
    }
  }
}
```

Esto permite:
- Auditoría: saber de dónde vino cada contacto
- Debugging: identificar problemas de sincronización
- Bidireccionalidad: futuro soporte para sync bidireccional

---

## Configuración del Middleware

El middleware debe exponer estos endpoints:

### POST `/api/contacts/created`
**Headers:**
- `Authorization: Bearer <supabase-jwt>`
- `X-JWT-Secret: <shared-secret>`

**Body:**
```typescript
{
  tenant_id: string;
  contact: {
    id: string;
    numero: string;
    nombre: string;
    attributes: Record<string, any>;
    created_at: string;
  };
}
```

**Lógica del middleware:**
1. Validar JWT
2. Consultar `integration_credentials` para el tenant
3. Para cada integración activa (ej: Pipedrive):
   - Mapear campos según `field_mappings`
   - Hacer POST a API externa
   - Guardar `external_id` de respuesta
4. Retornar resultado

### POST `/api/contacts/bulk_imported`
Similar al anterior pero recibe array de contactos.

---

## Ventajas de esta Arquitectura

### 1. **Prevención de Loops**
- Pipedrive → Dashboard usa `sync-contact-from-external` (no notifica)
- Dashboard → Pipedrive usa `create-contact` (sí notifica)
- Separación clara de responsabilidades

### 2. **Tenant-Aware**
- Solo sincroniza si el tenant tiene integraciones activas
- No hace llamadas innecesarias al middleware
- Escalable para múltiples integraciones

### 3. **Flexible**
- Flag `skip_external_sync` para casos especiales
- Metadata de origen para auditoría
- Soporte para múltiples fuentes (n8n, API, UI)

### 4. **Consistente**
- Todas las creaciones pasan por edge functions
- Validación centralizada (normalización de teléfonos, duplicados)
- RLS aplicado en todas las queries

### 5. **Escalable**
- Fácil añadir nuevas integraciones (Zoho, HubSpot, etc.)
- Middleware actúa como orquestador
- Edge functions son stateless

---

## Migraciones Necesarias

### 1. Añadir índices para optimizar consultas de integraciones

```sql
-- Índice para búsqueda rápida de integraciones activas por tenant
CREATE INDEX IF NOT EXISTS idx_integration_credentials_tenant_status
ON integration_credentials(tenant_id, status)
WHERE status = 'active';
```

### 2. (Opcional) Añadir campo para trackear origen en tabla

Si quieres un campo explícito en lugar de usar `attributes._sync_metadata`:

```sql
ALTER TABLE crm_contacts
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE INDEX idx_crm_contacts_external_id ON crm_contacts(external_id)
WHERE external_id IS NOT NULL;
```

---

## Checklist de Implementación

### Fase 1: Preparación
- [ ] Crear migración con índice para integraciones activas
- [ ] Configurar variables de entorno (JWT_SECRET, MIDDLEWARE_URL)
- [ ] Documentar endpoints del middleware

### Fase 2: Edge Functions
- [ ] Modificar `create-contact`: añadir verificación de integraciones + `skip_external_sync`
- [ ] Crear `sync-contact-from-external`: nueva función para sync desde externo
- [ ] Modificar `import-contacts`: añadir notificación al middleware
- [ ] Desplegar todas las functions

### Fase 3: Middleware
- [ ] Implementar endpoint `/api/contacts/created`
- [ ] Implementar endpoint `/api/contacts/bulk_imported`
- [ ] Configurar mapeo de campos por integración
- [ ] Implementar cliente de Pipedrive API

### Fase 4: n8n Workflows
- [ ] Workflow: Pipedrive → Dashboard (Caso 1)
  - Webhook trigger desde Pipedrive
  - Transform data
  - Call `sync-contact-from-external`
- [ ] Workflow: Otras fuentes → Dashboard (Caso 3)
  - Según fuente específica
  - Call `create-contact`

### Fase 5: Testing
- [ ] Test: Crear contacto desde UI → debe llegar a Pipedrive
- [ ] Test: Crear contacto desde Pipedrive → NO debe volver a Pipedrive
- [ ] Test: Crear contacto desde n8n → debe llegar a Pipedrive
- [ ] Test: Importar CSV → debe llegar a Pipedrive
- [ ] Test: Tenant sin integraciones activas → NO debe llamar middleware

---

## Ejemplo de Configuración n8n (Caso 1)

### Workflow: Pipedrive → Dashboard

```json
{
  "nodes": [
    {
      "name": "Webhook Pipedrive",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "pipedrive-contact-sync"
      }
    },
    {
      "name": "Transform Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "code": "const contact = items[0].json.current;\nreturn [{\n  json: {\n    tenant_id: '{{ $env.TENANT_ID }}',\n    integration_name: 'pipedrive',\n    contacts: [{\n      external_id: contact.id.toString(),\n      numero: contact.phone[0]?.value || '',\n      nombre: contact.name,\n      attributes: {\n        email: contact.email[0]?.value\n      }\n    }]\n  }\n}];"
      }
    },
    {
      "name": "Sync to Dashboard",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/sync-contact-from-external",
        "method": "POST",
        "headers": {
          "X-JWT-Secret": "={{ $env.JWT_SECRET }}"
        },
        "bodyParameters": "={{ $json }}"
      }
    }
  ]
}
```

---

## Resumen Ejecutivo

| Aspecto | Solución |
|---------|----------|
| **Problema** | 3 orígenes de contactos con diferentes requisitos de sync |
| **Solución** | 2 edge functions con lógica de enrutamiento inteligente |
| **Loop Prevention** | `sync-contact-from-external` nunca notifica middleware |
| **Tenant Isolation** | Verificación de `integration_credentials` antes de sync |
| **Flexibilidad** | Flag `skip_external_sync` para casos especiales |
| **Escalabilidad** | Middleware como orquestador multi-integración |
| **Implementación** | 1 nueva edge function + modificaciones a 2 existentes |
