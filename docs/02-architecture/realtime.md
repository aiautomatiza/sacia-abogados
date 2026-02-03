# Realtime Updates

Sistema de actualizaciones en tiempo real usando Supabase Realtime.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│  INSERT/UPDATE/DELETE en tabla                              │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  │ Postgres Trigger
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE REALTIME                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  - Recibe evento de Postgres                          │ │
│  │  - Filtra por tenant_id (si configurado)              │ │
│  │  - Broadcast a clientes suscritos                     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  │ WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  useRealtime hook                                      │ │
│  │  - Recibe evento                                       │ │
│  │  - Debounce (1000ms)                                   │ │
│  │  - Invalida React Query cache                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                              │                              │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  React Query                                           │ │
│  │  - Marca query como stale                              │ │
│  │  - Refetch automatico                                  │ │
│  │  - UI se actualiza                                     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Hook useRealtime

### Ubicacion

```
src/hooks/use-realtime.ts
```

### API

```typescript
interface RealtimeSubscription {
  table: string;
  schema?: string;           // default: 'public'
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;           // ej: `tenant_id=eq.${tenantId}`
  queryKeysToInvalidate: QueryKey[];
  onPayload?: (payload: RealtimePayload) => void;
}

interface UseRealtimeOptions {
  subscriptions: RealtimeSubscription[];
  debounceMs?: number;       // default: 1000
  enabled?: boolean;         // default: true
}

function useRealtime(options: UseRealtimeOptions): {
  status: 'connecting' | 'connected' | 'disconnected';
  error: Error | null;
}
```

### Uso Basico

```typescript
import { useRealtime } from '@/hooks/use-realtime';
import { useProfile } from '@/hooks/use-profile';

function ContactsPage() {
  const { tenantId } = useProfile();

  useRealtime({
    subscriptions: [
      {
        table: 'crm_contacts',
        event: '*',
        filter: `tenant_id=eq.${tenantId}`,
        queryKeysToInvalidate: [['contacts', tenantId]],
      },
    ],
    enabled: !!tenantId,
  });

  // ... resto del componente
}
```

### Multiples Suscripciones

```typescript
function ConversationsPage() {
  const { tenantId } = useProfile();

  useRealtime({
    subscriptions: [
      // Suscripcion a conversaciones
      {
        table: 'conversations',
        filter: `tenant_id=eq.${tenantId}`,
        queryKeysToInvalidate: [['conversations', tenantId]],
      },
      // Suscripcion a mensajes
      {
        table: 'conversation_messages',
        queryKeysToInvalidate: [['messages']],
        onPayload: (payload) => {
          // Manejar nuevo mensaje
          if (payload.eventType === 'INSERT') {
            playNotificationSound();
          }
        },
      },
    ],
    debounceMs: 500, // Mas rapido para mensajes
    enabled: !!tenantId,
  });
}
```

### Con Callback Personalizado

```typescript
useRealtime({
  subscriptions: [
    {
      table: 'crm_contacts',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['contacts', tenantId]],
      onPayload: (payload) => {
        console.log('Evento recibido:', payload.eventType);
        console.log('Datos nuevos:', payload.new);
        console.log('Datos anteriores:', payload.old);

        // Mostrar notificacion
        if (payload.eventType === 'INSERT') {
          toast.info(`Nuevo contacto: ${payload.new.nombre}`);
        }
      },
    },
  ],
});
```

## Implementacion Interna

```typescript
// src/hooks/use-realtime.ts
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtime({
  subscriptions,
  debounceMs = 1000,
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) {
      return;
    }

    // Crear canal unico
    const channelName = `realtime-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Agregar suscripciones
    subscriptions.forEach(sub => {
      channel.on(
        'postgres_changes',
        {
          event: sub.event || '*',
          schema: sub.schema || 'public',
          table: sub.table,
          filter: sub.filter,
        },
        (payload) => {
          // Callback personalizado
          if (sub.onPayload) {
            sub.onPayload(payload);
          }

          // Debounce de invalidacion
          const key = sub.table + sub.filter;
          const existingTimeout = timeoutRef.current.get(key);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(() => {
            sub.queryKeysToInvalidate.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey });
            });
            timeoutRef.current.delete(key);
          }, debounceMs);

          timeoutRef.current.set(key, timeout);
        }
      );
    });

    // Suscribirse al canal
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setStatus('connected');
        setError(null);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setStatus('disconnected');
      } else if (status === 'TIMED_OUT') {
        setError(new Error('Connection timed out'));
        // Retry logic
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      timeoutRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutRef.current.clear();
      channel.unsubscribe();
    };
  }, [enabled, JSON.stringify(subscriptions), debounceMs, queryClient]);

  return { status, error };
}
```

## Configuracion en Supabase

### Habilitar Realtime en Tablas

En Supabase Dashboard:
1. Ir a **Database** > **Replication**
2. Habilitar **supabase_realtime** para las tablas deseadas

O via SQL:

```sql
-- Habilitar realtime en tabla
ALTER PUBLICATION supabase_realtime ADD TABLE crm_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;
```

### Tablas con Realtime Habilitado

| Tabla | Eventos |
|-------|---------|
| `crm_contacts` | INSERT, UPDATE, DELETE |
| `conversations` | INSERT, UPDATE |
| `conversation_messages` | INSERT |
| `crm_calls` | INSERT, UPDATE |
| `campaigns` | INSERT, UPDATE |
| `campaign_queue` | UPDATE |
| `appointments` | INSERT, UPDATE, DELETE |
| `integration_credentials` | INSERT, UPDATE |

## Filtrado por Tenant

**CRITICO:** Siempre filtrar por tenant_id para seguridad:

```typescript
// CORRECTO - Filtrado por tenant
useRealtime({
  subscriptions: [{
    table: 'crm_contacts',
    filter: `tenant_id=eq.${tenantId}`,
    queryKeysToInvalidate: [['contacts', tenantId]],
  }],
  enabled: !!tenantId,
});

// INCORRECTO - Sin filtro (recibe todos los eventos)
useRealtime({
  subscriptions: [{
    table: 'crm_contacts',
    // Sin filter!
    queryKeysToInvalidate: [['contacts']],
  }],
});
```

## Debouncing

El debouncing evita re-renders excesivos cuando hay cambios rapidos:

```typescript
// Debounce de 1 segundo (default)
// Si hay 10 cambios en 500ms, solo se invalida una vez
useRealtime({
  subscriptions: [...],
  debounceMs: 1000,
});

// Sin debounce para mensajes (necesitas respuesta inmediata)
useRealtime({
  subscriptions: [...],
  debounceMs: 0,
});

// Debounce mas largo para datos que cambian mucho
useRealtime({
  subscriptions: [...],
  debounceMs: 2000,
});
```

## Manejo de Errores

```typescript
function ContactsPage() {
  const { status, error } = useRealtime({
    subscriptions: [...],
  });

  // Mostrar estado de conexion
  return (
    <div>
      {status === 'connecting' && <Badge>Conectando...</Badge>}
      {status === 'connected' && <Badge variant="success">En vivo</Badge>}
      {status === 'disconnected' && <Badge variant="error">Desconectado</Badge>}
      {error && <Alert variant="error">{error.message}</Alert>}
    </div>
  );
}
```

## Patrones Comunes

### Pagina con Lista

```typescript
function ContactsPage() {
  const { tenantId } = useProfile();

  // Query para datos
  const { data: contacts } = useContacts();

  // Realtime para updates
  useRealtime({
    subscriptions: [{
      table: 'crm_contacts',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['contacts', tenantId]],
    }],
    enabled: !!tenantId,
  });

  return <ContactList contacts={contacts} />;
}
```

### Chat con Mensajes

```typescript
function ConversationDetail({ conversationId }: Props) {
  const { tenantId } = useProfile();

  // Query para mensajes
  const { data: messages } = useMessages(conversationId);

  // Realtime con debounce corto
  useRealtime({
    subscriptions: [{
      table: 'conversation_messages',
      filter: `conversation_id=eq.${conversationId}`,
      queryKeysToInvalidate: [['messages', conversationId]],
      onPayload: (payload) => {
        if (payload.eventType === 'INSERT') {
          // Scroll al nuevo mensaje
          scrollToBottom();
        }
      },
    }],
    debounceMs: 100, // Respuesta rapida para chat
    enabled: !!conversationId,
  });

  return <MessageList messages={messages} />;
}
```

## Troubleshooting

### No recibo eventos

1. Verificar que Realtime esta habilitado en la tabla
2. Verificar el filtro (sintaxis correcta)
3. Verificar que `enabled: true`
4. Revisar consola por errores de WebSocket

### Demasiados re-renders

1. Aumentar `debounceMs`
2. Ser mas especifico con `queryKeysToInvalidate`
3. Usar `onPayload` para filtrar eventos

### Conexion se pierde

El hook tiene retry automatico. Si persiste:
1. Verificar conexion a internet
2. Verificar que Supabase esta activo
3. Revisar limites del plan de Supabase

## Siguiente Paso

Continua con [Authentication](./authentication.md) para ver el sistema de autenticacion.
