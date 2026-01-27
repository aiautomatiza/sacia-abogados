/**
 * @fileoverview Realtime Hook for Conversations - TIER S OPTIMIZADO
 * @description Usa el hook genérico useRealtime con filtros tenant_id para seguridad
 * @performance Actualización granular de cache sin invalidación completa
 * @refactor Eliminadas 100+ líneas de código duplicado, ahora usa patrón consistente con calls
 */

import { useMemo, useCallback } from "react";
import { useRealtime, type RealtimeSubscription, type RealtimePayload } from "@/hooks/use-realtime";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationWithContact } from "../types";

interface UseRealtimeConversationsOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export function useRealtimeConversations({
  debounceMs = 500, // TIER S: Reducido de 2000ms a 500ms para mejor UX
  enabled = true,
}: UseRealtimeConversationsOptions = {}) {
  const { tenantId, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();

  /**
   * TIER S: Actualización granular de conversación en lista infinita
   * En lugar de invalidar toda la lista, actualizamos solo la conversación afectada
   */
  const updateConversationInList = useCallback(
    (conversationId: string, updates: Partial<ConversationWithContact>) => {
      const queryKey = ["conversations", "infinite", tenantId];

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: ConversationWithContact) =>
              conv.id === conversationId ? { ...conv, ...updates } : conv
            ),
          })),
        };
      });
    },
    [tenantId, queryClient]
  );

  /**
   * TIER S: Handler optimizado para eventos de mensajes
   * Actualiza last_message_at, last_message_preview, unread_count in-place
   */
  const handleMessageEvent = useCallback(
    (payload: RealtimePayload) => {
      const conversationId =
        (payload.new as { conversation_id?: string })?.conversation_id ||
        (payload.old as { conversation_id?: string })?.conversation_id;

      if (!conversationId) return;

      if (payload.eventType === "INSERT") {
        const newMessage = payload.new as {
          content?: string;
          created_at?: string;
          sender_type?: string;
        };

        // Actualizar conversación en la lista sin invalidar
        updateConversationInList(conversationId, {
          last_message_at: newMessage.created_at || new Date().toISOString(),
          last_message_preview: newMessage.content?.substring(0, 100) || null,
          // Solo incrementar unread si es mensaje del contacto
          ...(newMessage.sender_type === "contact" && {
            unread_count: undefined, // Se recalculará con invalidación selectiva
          }),
        });

        // Invalidar conversación específica para obtener unread_count actualizado
        queryClient.invalidateQueries({
          queryKey: ["conversation", conversationId],
          exact: true,
        });
      }
    },
    [updateConversationInList, queryClient]
  );

  /**
   * TIER S: Handler para cambios en conversaciones
   * Actualiza estado, assigned_to, tags, etc. sin invalidar toda la lista
   */
  const handleConversationEvent = useCallback(
    (payload: RealtimePayload) => {
      const conversationId = (payload.new as { id?: string })?.id;

      if (payload.eventType === "UPDATE" && conversationId) {
        // Actualizar conversación específica in-place
        updateConversationInList(conversationId, payload.new as Partial<ConversationWithContact>);
      } else if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
        // Para INSERT/DELETE, necesitamos invalidar para actualizar la lista
        queryClient.invalidateQueries({
          queryKey: ["conversations", "infinite", tenantId],
        });
      }
    },
    [updateConversationInList, tenantId, queryClient]
  );

  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!tenantId) return [];

    return [
      // Subscription 1: conversations table - TIER S optimizado
      {
        table: "conversations",
        event: "*",
        filter: `tenant_id=eq.${tenantId}`, // CRÍTICO: Filtro por tenant para seguridad
        queryKeysToInvalidate: [], // TIER S: No invalidamos, manejamos en onPayload
        onPayload: handleConversationEvent,
      },
      // Subscription 2: conversation_messages table - TIER S optimizado
      // NOTA: Los mensajes específicos se manejan en useRealtimeMessages
      // Aquí solo actualizamos la lista de conversaciones
      {
        table: "conversation_messages",
        event: "INSERT", // Solo INSERT para actualizar preview y timestamp
        queryKeysToInvalidate: [], // TIER S: No invalidamos, manejamos en onPayload
        onPayload: handleMessageEvent,
      },
      // Subscription 3: whatsapp_numbers table
      {
        table: "whatsapp_numbers",
        event: "*",
        filter: `tenant_id=eq.${tenantId}`, // Filtro por tenant para seguridad
        queryKeysToInvalidate: [
          ["whatsapp-numbers"], // Actualiza lista de números WhatsApp
        ],
      },
    ];
  }, [tenantId, handleConversationEvent, handleMessageEvent]);

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
