/**
 * @fileoverview Realtime Hook for Conversations - MIGRADO A HOOK GENÉRICO
 * @description Usa el hook genérico useRealtime con filtros tenant_id para seguridad
 * @refactor Eliminadas 100+ líneas de código duplicado, ahora usa patrón consistente con calls
 */

import { useMemo } from "react";
import { useRealtime, type RealtimeSubscription } from "@/hooks/use-realtime";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

interface UseRealtimeConversationsOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export function useRealtimeConversations({
  debounceMs = 2000, // Aumentado de 1s a 2s para reducir re-renders
  enabled = true,
}: UseRealtimeConversationsOptions = {}) {
  const { tenantId, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();

  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!tenantId) return [];

    return [
      // Subscription 1: conversations table
      {
        table: "conversations",
        event: "*",
        filter: `tenant_id=eq.${tenantId}`, // CRÍTICO: Filtro por tenant para seguridad
        queryKeysToInvalidate: [
          ["conversations", "infinite", tenantId], // Invalidación granular con tenantId
        ],
      },
      // Subscription 2: conversation_messages table
      {
        table: "conversation_messages",
        event: "*",
        queryKeysToInvalidate: [
          ["conversations", "infinite", tenantId], // Actualiza lista al nuevo mensaje
        ],
        onPayload: (payload) => {
          // Invalidaciones específicas para mensajes de una conversación
          const conversationId =
            (payload.new as { conversation_id?: string })?.conversation_id ||
            (payload.old as { conversation_id?: string })?.conversation_id;

          if (conversationId) {
            // Invalidar mensajes de la conversación específica
            queryClient.invalidateQueries({
              queryKey: ["conversation-messages", conversationId],
              exact: true, // CRÍTICO: exact true para no invalidar otras queries
            });
            // Invalidar conversación específica (actualiza unread_count, last_message)
            queryClient.invalidateQueries({
              queryKey: ["conversation", conversationId],
              exact: true,
            });
          }
        },
      },
      // Subscription 3: whatsapp_numbers table
      {
        table: "whatsapp_numbers",
        event: "*",
        filter: `tenant_id=eq.${tenantId}`, // Filtro por tenant para seguridad
        queryKeysToInvalidate: [
          ["whatsapp-numbers"], // Actualiza lista de números WhatsApp
          ["conversations"], // Actualiza conversaciones (pueden tener nuevos números)
        ],
      },
    ];
  }, [tenantId, queryClient]);

  const { isConnected, connectionStatus } = useRealtime({
    subscriptions,
    debounceMs,
    enabled: enabled && !!tenantId,
    channelName: tenantId ? `conversations-${tenantId}` : undefined,
  });

  return {
    isConnected,
    connectionStatus,
    isInitializing: isProfileLoading || (!tenantId && enabled),
  };
}
