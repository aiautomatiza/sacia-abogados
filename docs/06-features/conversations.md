# Conversations

Sistema de mensajeria multi-canal con actualizaciones en tiempo real.

## Descripcion

El modulo de conversaciones permite gestionar comunicaciones con clientes a traves de multiples canales: WhatsApp, Instagram, webchat y email. Incluye soporte para mensajes de texto, archivos, audio y templates de WhatsApp.

## Casos de Uso

1. Ver inbox de conversaciones con filtros por canal y estado
2. Seleccionar conversacion y ver historial de mensajes
3. Enviar mensajes de texto, archivos y audio
4. Usar templates de WhatsApp para mensajes fuera de ventana 24h
5. Asignar conversaciones a agentes
6. Etiquetar conversaciones
7. Archivar conversaciones

## Estructura de Archivos

```
src/features/conversations/
├── components/
│   ├── ConversationList.tsx      # Lista de conversaciones
│   ├── ConversationItem.tsx      # Item individual
│   ├── ConversationDetail.tsx    # Detalle con mensajes
│   ├── MessageList.tsx           # Lista de mensajes
│   ├── MessageBubble.tsx         # Burbuja de mensaje
│   ├── MessageInput.tsx          # Input para enviar
│   ├── TemplateSelector.tsx      # Selector de templates
│   ├── ConversationFilters.tsx   # Filtros
│   ├── ConversationActions.tsx   # Acciones (asignar, tag, etc)
│   └── AttachmentPreview.tsx     # Preview de archivos
├── hooks/
│   ├── useInfiniteConversations.ts # Lista paginada
│   ├── useConversation.ts          # Detalle
│   ├── useMessages.ts              # Mensajes
│   ├── useConversationMutations.ts # Mutations
│   └── useWhatsAppTemplates.ts     # Templates
├── services/
│   ├── conversation.service.ts
│   ├── message.service.ts
│   └── whatsapp-templates.service.ts
└── types/
    └── index.ts
```

## Base de Datos

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `conversations` | Conversaciones |
| `conversation_messages` | Mensajes |
| `conversation_tags` | Etiquetas |
| `whatsapp_templates` | Templates WA |

### Enums

```typescript
type ConversationChannel = 'whatsapp' | 'instagram' | 'webchat' | 'email';
type ConversationStatus = 'active' | 'archived';
type MessageContentType = 'text' | 'audio' | 'image' | 'document' | 'video' | 'location' | 'sticker';
type MessageSenderType = 'contact' | 'agent' | 'system' | 'ai';
type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
```

## Hooks

### useInfiniteConversations

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
} = useInfiniteConversations({
  channel: 'whatsapp',
  status: 'active',
});

// Aplanar paginas
const conversations = data?.pages.flatMap(p => p.data) ?? [];
```

### useMessages

```typescript
const {
  data: messages,
  isLoading,
} = useMessages(conversationId);
```

### useConversationMutations

```typescript
const {
  sendMessage,
  sendTemplateMessage,
  assignConversation,
  tagConversation,
  archiveConversation,
  markAsRead,
} = useConversationMutations();

// Enviar mensaje
sendMessage.mutate({
  conversationId,
  content: 'Hola!',
  contentType: 'text',
});

// Enviar template
sendTemplateMessage.mutate({
  conversationId,
  templateId: 'template-id',
  variables: { '1': 'Juan' },
});

// Asignar
assignConversation.mutate({
  conversationId,
  agentId: 'agent-id',
});
```

## Componentes

### Layout de Conversaciones

```typescript
// Pagina con layout de 2 columnas
<div className="flex h-full">
  {/* Lista */}
  <div className="w-80 border-r">
    <ConversationFilters value={filters} onChange={setFilters} />
    <ConversationList
      conversations={conversations}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  </div>

  {/* Detalle */}
  <div className="flex-1">
    {selectedId ? (
      <ConversationDetail conversationId={selectedId} />
    ) : (
      <EmptyState message="Selecciona una conversacion" />
    )}
  </div>
</div>
```

### MessageInput

```typescript
<MessageInput
  conversationId={conversationId}
  isWithin24hWindow={isWithin24hWindow}
  onSend={(content, type, file) => {
    sendMessage.mutate({ conversationId, content, contentType: type, file });
  }}
  onSendTemplate={() => setShowTemplates(true)}
/>
```

## Ventana 24h de WhatsApp

WhatsApp Business tiene restriccion de 24 horas:

```typescript
function isWithin24hWindow(conversation: Conversation): boolean {
  if (conversation.channel !== 'whatsapp') return true;
  if (!conversation.whatsapp_24h_window_expires_at) return false;
  return new Date(conversation.whatsapp_24h_window_expires_at) > new Date();
}
```

- **Dentro de ventana**: Enviar cualquier mensaje
- **Fuera de ventana**: Solo templates aprobados

## Realtime

```typescript
// Suscripcion a conversaciones
useRealtime({
  subscriptions: [
    {
      table: 'conversations',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['conversations']],
    },
    {
      table: 'conversation_messages',
      queryKeysToInvalidate: [['messages']],
      onPayload: (payload) => {
        if (payload.eventType === 'INSERT') {
          // Notificar nuevo mensaje
          playNotificationSound();
        }
      },
    },
  ],
  debounceMs: 100, // Rapido para chat
});
```

## Edge Functions

| Funcion | Descripcion |
|---------|-------------|
| `send-conversation-message` | Enviar mensaje |
| `send-template-message` | Enviar template WA |
| `process-whatsapp-attachment` | Procesar adjuntos |

## Flujo de Mensajes

### Enviar Mensaje

```
1. Usuario escribe mensaje
2. UI muestra mensaje con status "sending"
3. Mutation llama a send-conversation-message
4. Edge Function envia a WhatsApp/etc
5. Guarda mensaje en DB
6. Realtime notifica
7. UI actualiza status
```

### Recibir Mensaje

```
1. Webhook recibe mensaje de WhatsApp
2. Middleware procesa y guarda en DB
3. Realtime dispara evento
4. Frontend invalida queries
5. UI muestra nuevo mensaje
```

## Archivos Adjuntos

```typescript
// Hook para upload
const { uploadFile, isUploading } = useFileUpload();

// Enviar archivo
const handleSendFile = async (file: File) => {
  const { url, type } = await uploadFile(file);
  sendMessage.mutate({
    conversationId,
    contentType: type, // 'image', 'document', etc.
    fileUrl: url,
    fileName: file.name,
  });
};
```

## Audio Recording

```typescript
// Hook para grabar audio
const {
  isRecording,
  startRecording,
  stopRecording,
  audioBlob,
} = useAudioRecorder();

// Convertir a formato compatible
const { convert } = useAudioConverter();
const convertedBlob = await convert(audioBlob);
```

## URL State

La conversacion seleccionada se guarda en URL:

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const conversationId = searchParams.get('conversationId');

const selectConversation = (id: string) => {
  setSearchParams({ conversationId: id });
};
```

## Permisos

| Accion | user_client | super_admin |
|--------|-------------|-------------|
| Ver | Solo su tenant | Todos |
| Enviar mensaje | Solo su tenant | Todos |
| Asignar | Solo su tenant | Todos |
| Archivar | Solo su tenant | Todos |
