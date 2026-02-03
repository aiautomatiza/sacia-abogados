# Tabla: conversations

## Descripcion

Conversaciones con contactos a traves de diferentes canales (WhatsApp, Instagram, webchat, email).

## Columnas

| Columna | Tipo | Nullable | Default | Descripcion |
|---------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `tenant_id` | UUID | NO | - | FK a tenants |
| `contact_id` | UUID | NO | - | FK a crm_contacts |
| `channel` | conversation_channel | NO | `'whatsapp'` | Canal de comunicacion |
| `status` | conversation_status | NO | `'active'` | Estado de la conversacion |
| `assigned_to` | UUID | SI | NULL | Agente asignado (FK profiles) |
| `tags` | TEXT[] | SI | NULL | Array de IDs de tags |
| `unread_count` | INT | NO | `0` | Mensajes sin leer |
| `last_message_at` | TIMESTAMP | SI | NULL | Timestamp ultimo mensaje |
| `last_message_preview` | TEXT | SI | NULL | Preview del ultimo mensaje |
| `whatsapp_24h_window_expires_at` | TIMESTAMP | SI | NULL | Expiracion ventana 24h |
| `ai_conversation_id` | TEXT | SI | NULL | ID de conversacion con AI |
| `state` | TEXT | SI | NULL | Estado de flujo |
| `pending_agent_response` | BOOLEAN | SI | NULL | Esperando respuesta de agente |
| `metadata` | JSONB | SI | NULL | Metadatos adicionales |
| `created_at` | TIMESTAMP | NO | `NOW()` | Fecha de creacion |
| `updated_at` | TIMESTAMP | NO | `NOW()` | Ultima actualizacion |

## Enums

### conversation_channel

```sql
CREATE TYPE conversation_channel AS ENUM (
  'whatsapp',
  'instagram',
  'webchat',
  'email'
);
```

### conversation_status

```sql
CREATE TYPE conversation_status AS ENUM (
  'active',
  'archived'
);
```

## Relaciones

### Foreign Keys

| Columna | Referencia |
|---------|------------|
| `tenant_id` | `tenants(id)` |
| `contact_id` | `crm_contacts(id)` |
| `assigned_to` | `profiles(id)` |

### Tablas que referencian conversations

| Tabla | FK |
|-------|-------|
| `conversation_messages` | `conversation_id` |

## RLS Policies

```sql
CREATE POLICY "tenant_conversations_select" ON conversations
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_conversations_insert" ON conversations
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "tenant_conversations_update" ON conversations
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

## Indices

```sql
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to);

-- Indice compuesto para filtros comunes
CREATE INDEX idx_conversations_tenant_status_channel
ON conversations(tenant_id, status, channel, last_message_at DESC);
```

## Queries Comunes

### Listar conversaciones activas

```sql
SELECT
  c.*,
  ct.nombre as contact_name,
  ct.numero as contact_phone,
  p.email as assigned_email
FROM conversations c
LEFT JOIN crm_contacts ct ON c.contact_id = ct.id
LEFT JOIN profiles p ON c.assigned_to = p.id
WHERE c.tenant_id = $1
  AND c.status = 'active'
ORDER BY c.last_message_at DESC NULLS LAST
LIMIT 50;
```

### Filtrar por canal y tags

```sql
SELECT *
FROM conversations
WHERE tenant_id = $1
  AND channel = $2
  AND tags && ARRAY[$3]::TEXT[]
ORDER BY last_message_at DESC;
```

### Verificar ventana 24h WhatsApp

```sql
SELECT
  id,
  whatsapp_24h_window_expires_at,
  CASE
    WHEN whatsapp_24h_window_expires_at > NOW() THEN true
    ELSE false
  END as is_within_window
FROM conversations
WHERE id = $1 AND channel = 'whatsapp';
```

### Asignar conversacion

```sql
UPDATE conversations
SET assigned_to = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;
```

### Archivar conversacion

```sql
UPDATE conversations
SET status = 'archived', updated_at = NOW()
WHERE id = $1
RETURNING *;
```

### Marcar como leido

```sql
UPDATE conversations
SET unread_count = 0, updated_at = NOW()
WHERE id = $1
RETURNING *;
```

## TypeScript Type

```typescript
import type { Database } from '@/integrations/supabase/types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type ConversationChannel = Database['public']['Enums']['conversation_channel'];
type ConversationStatus = Database['public']['Enums']['conversation_status'];

// Con datos relacionados
interface ConversationWithContact extends Conversation {
  contact: {
    nombre: string | null;
    numero: string;
  };
  assigned_agent?: {
    email: string;
  };
}
```

## Ventana 24h de WhatsApp

WhatsApp Business API tiene una restriccion de 24 horas:

- **Dentro de ventana**: Puedes enviar cualquier mensaje
- **Fuera de ventana**: Solo puedes usar templates aprobados

```typescript
// Verificar ventana
function isWithin24hWindow(conversation: Conversation): boolean {
  if (conversation.channel !== 'whatsapp') return true;
  if (!conversation.whatsapp_24h_window_expires_at) return false;
  return new Date(conversation.whatsapp_24h_window_expires_at) > new Date();
}
```

## Realtime

La tabla tiene Realtime habilitado para actualizaciones en vivo:

```typescript
useRealtime({
  subscriptions: [{
    table: 'conversations',
    filter: `tenant_id=eq.${tenantId}`,
    queryKeysToInvalidate: [['conversations']],
  }],
});
```

## Notas

- Una conversacion por contacto por canal (puede haber WhatsApp e Instagram del mismo contacto)
- `tags` es un array de UUIDs de `conversation_tags`
- `last_message_preview` se trunca a 100 caracteres
- El trigger `update_conversation_last_message` actualiza automaticamente
