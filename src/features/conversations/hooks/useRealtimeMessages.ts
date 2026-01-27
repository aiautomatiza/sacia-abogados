/**
 * @fileoverview Realtime Messages Hook - Tier S Optimization
 * @description Suscripción granular por conversación con debounce optimizado para UX instantánea
 * @performance Filtro por conversation_id evita recibir eventos de otras conversaciones
 */

import { useMemo, useCallback } from "react";
import { useRealtime, type RealtimeSubscription, type RealtimePayload } from "@/hooks/use-realtime";
import { useQueryClient } from "@tanstack/react-query";
import type { MessageWithSender } from "../types";

interface UseRealtimeMessagesOptions {
  /** ID de la conversación activa (null si no hay ninguna seleccionada) */
  conversationId: string | null;
  /** Debounce en ms - por defecto 100ms para UX instantánea */
  debounceMs?: number;
  /** Habilitar/deshabilitar suscripción */
  enabled?: boolean;
}

interface UseRealtimeMessagesReturn {
  /** Estado de conexión realtime */
  isConnected: boolean;
  /** Estado detallado de conexión */
  connectionStatus: "initializing" | "connecting" | "connected" | "disconnected" | "error";
}

/**
 * Hook optimizado para suscripción realtime de mensajes de una conversación específica.
 *
 * Optimizaciones Tier S:
 * - Filtro `conversation_id` evita procesar eventos de otras conversaciones
 * - Debounce de 100ms (vs 2000ms general) para respuesta instantánea
 * - Inserción optimista de mensajes nuevos sin invalidar cache completo
 * - Actualización in-place de delivery_status sin refetch
 */
export function useRealtimeMessages({
  conversationId,
  debounceMs = 100, // UX instantánea
  enabled = true,
}: UseRealtimeMessagesOptions): UseRealtimeMessagesReturn {
  const queryClient = useQueryClient();

  /**
   * Handler optimista para mensajes nuevos - inserta directamente en cache
   * sin esperar invalidación/refetch
   */
  const handleMessagePayload = useCallback(
    (payload: RealtimePayload) => {
      if (!conversationId) return;

      const queryKey = ["conversation-messages", conversationId];

      if (payload.eventType === "INSERT") {
        // Inserción optimista - agregar mensaje al final del array
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.messages) return old;

          const newMessage = payload.new as MessageWithSender;

          // Evitar duplicados (puede llegar por optimistic update de useSendMessage)
          const exists = old.messages.some((m: MessageWithSender) =>
            m.id === newMessage.id ||
            (m.id.startsWith('temp-') && m.content === newMessage.content)
          );

          if (exists) {
            // Si existe un mensaje temporal, reemplazarlo con el real
            return {
              ...old,
              messages: old.messages.map((m: MessageWithSender) =>
                m.id.startsWith('temp-') && m.content === newMessage.content
                  ? newMessage
                  : m
              ),
            };
          }

          // Agregar nuevo mensaje al final (orden ASC)
          return {
            ...old,
            messages: [...old.messages, newMessage],
            total: old.total + 1,
          };
        });
      } else if (payload.eventType === "UPDATE") {
        // Actualizar mensaje existente (delivery_status, etc.)
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.messages) return old;

          const updatedMessage = payload.new as MessageWithSender;

          return {
            ...old,
            messages: old.messages.map((m: MessageWithSender) =>
              m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
            ),
          };
        });
      } else if (payload.eventType === "DELETE") {
        // Eliminar mensaje
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.messages) return old;

          const deletedId = (payload.old as MessageWithSender).id;

          return {
            ...old,
            messages: old.messages.filter((m: MessageWithSender) => m.id !== deletedId),
            total: Math.max(0, old.total - 1),
          };
        });
      }
    },
    [conversationId, queryClient]
  );

  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!conversationId) return [];

    return [
      {
        table: "conversation_messages",
        event: "*",
        // CRÍTICO: Filtro por conversation_id - solo recibe eventos de esta conversación
        filter: `conversation_id=eq.${conversationId}`,
        // No invalidamos - manejamos todo en onPayload para UX instantánea
        queryKeysToInvalidate: [],
        onPayload: handleMessagePayload,
      },
    ];
  }, [conversationId, handleMessagePayload]);

  const { isConnected, connectionStatus } = useRealtime({
    subscriptions,
    debounceMs,
    enabled: enabled && !!conversationId,
    channelName: conversationId ? `messages-${conversationId}` : undefined,
  });

  return {
    isConnected,
    connectionStatus,
  };
}
