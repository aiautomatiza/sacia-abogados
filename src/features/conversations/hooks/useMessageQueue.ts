/**
 * @fileoverview Message Queue Hook - TIER S Offline Support
 * @description Cola local para mensajes cuando offline con retry automático
 * @performance Persistencia en localStorage, retry con backoff exponencial
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SendMessageInput, MessageWithSender } from "../types";

const QUEUE_STORAGE_KEY = "conversations-message-queue";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo

interface QueuedMessage {
  id: string;
  input: SendMessageInput;
  status: "queued" | "sending" | "failed";
  retryCount: number;
  queuedAt: string;
  lastError?: string;
}

interface UseMessageQueueOptions {
  /** Función para enviar el mensaje al servidor */
  sendMessageFn: (input: SendMessageInput) => Promise<MessageWithSender | null>;
  /** Habilitar/deshabilitar la cola */
  enabled?: boolean;
}

interface UseMessageQueueReturn {
  /** Agregar mensaje a la cola */
  enqueue: (input: SendMessageInput) => void;
  /** Mensajes en cola */
  queue: QueuedMessage[];
  /** Cantidad de mensajes pendientes */
  pendingCount: number;
  /** Si está procesando la cola */
  isProcessing: boolean;
  /** Limpiar mensajes fallidos */
  clearFailed: () => void;
  /** Reintentar mensajes fallidos */
  retryFailed: () => void;
  /** Si el navegador está online */
  isOnline: boolean;
}

/**
 * Hook para manejar cola de mensajes con soporte offline
 *
 * Características:
 * - Detecta estado online/offline del navegador
 * - Persiste cola en localStorage
 * - Retry automático con backoff exponencial
 * - Actualización optimista del cache de React Query
 */
export function useMessageQueue({
  sendMessageFn,
  enabled = true,
}: UseMessageQueueOptions): UseMessageQueueReturn {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const queryClient = useQueryClient();
  const processingRef = useRef(false);

  // Cargar cola desde localStorage al montar
  useEffect(() => {
    if (!enabled) return;

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedMessage[];
        // Resetear status de "sending" a "queued" (podría haber quedado así si se cerró el navegador)
        const resetQueue = parsed.map((msg) => ({
          ...msg,
          status: msg.status === "sending" ? "queued" : msg.status,
        })) as QueuedMessage[];
        setQueue(resetQueue);
      }
    } catch (e) {
      console.error("[MessageQueue] Error loading from localStorage:", e);
    }
  }, [enabled]);

  // Persistir cola en localStorage cuando cambia
  useEffect(() => {
    if (!enabled) return;

    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("[MessageQueue] Error saving to localStorage:", e);
    }
  }, [queue, enabled]);

  // Listener para cambios de conexión
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = () => {
      console.log("[MessageQueue] Browser is online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("[MessageQueue] Browser is offline");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled]);

  // Procesar cola cuando vuelve online
  const processQueue = useCallback(async () => {
    if (!enabled || !isOnline || processingRef.current) return;

    const pendingMessages = queue.filter((m) => m.status === "queued");
    if (pendingMessages.length === 0) return;

    processingRef.current = true;
    setIsProcessing(true);

    console.log(`[MessageQueue] Processing ${pendingMessages.length} queued messages`);

    for (const queuedMsg of pendingMessages) {
      // Marcar como enviando
      setQueue((prev) =>
        prev.map((m) =>
          m.id === queuedMsg.id ? { ...m, status: "sending" as const } : m
        )
      );

      try {
        // Calcular delay con backoff exponencial
        if (queuedMsg.retryCount > 0) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, queuedMsg.retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Enviar mensaje
        await sendMessageFn(queuedMsg.input);

        // Éxito - remover de la cola
        setQueue((prev) => prev.filter((m) => m.id !== queuedMsg.id));

        console.log(`[MessageQueue] Message ${queuedMsg.id} sent successfully`);
      } catch (error: any) {
        console.error(`[MessageQueue] Error sending message ${queuedMsg.id}:`, error);

        const newRetryCount = queuedMsg.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          // Marcar como fallido después de max retries
          setQueue((prev) =>
            prev.map((m) =>
              m.id === queuedMsg.id
                ? {
                    ...m,
                    status: "failed" as const,
                    retryCount: newRetryCount,
                    lastError: error.message || "Error desconocido",
                  }
                : m
            )
          );
        } else {
          // Volver a cola para retry
          setQueue((prev) =>
            prev.map((m) =>
              m.id === queuedMsg.id
                ? {
                    ...m,
                    status: "queued" as const,
                    retryCount: newRetryCount,
                    lastError: error.message || "Error desconocido",
                  }
                : m
            )
          );
        }
      }
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [enabled, isOnline, queue, sendMessageFn]);

  // Procesar cola automáticamente cuando vuelve online
  useEffect(() => {
    if (isOnline && enabled) {
      processQueue();
    }
  }, [isOnline, enabled, processQueue]);

  // Agregar mensaje a la cola
  const enqueue = useCallback(
    (input: SendMessageInput) => {
      const queuedMessage: QueuedMessage = {
        id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        input,
        status: "queued",
        retryCount: 0,
        queuedAt: new Date().toISOString(),
      };

      // Agregar mensaje optimista al cache de React Query
      const queryKey = ["conversation-messages", input.conversation_id];
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const optimisticMessage: MessageWithSender = {
          id: queuedMessage.id,
          conversation_id: input.conversation_id,
          sender_type: "agent",
          sender_id: input.sender_id || null,
          content: input.content || null,
          content_type: input.content_type,
          file_url: input.file_url || null,
          file_name: input.file_name || null,
          file_type: input.file_type || null,
          file_size: input.file_size || null,
          delivery_status: "sending",
          external_message_id: null,
          error_message: null,
          replied_to_message_id: input.replied_to_message_id || null,
          metadata: input.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return {
          ...old,
          messages: [...(old.messages || []), optimisticMessage],
          total: (old.total || 0) + 1,
        };
      });

      // Agregar a la cola
      setQueue((prev) => [...prev, queuedMessage]);

      console.log(`[MessageQueue] Message ${queuedMessage.id} enqueued`);

      // Si está online, procesar inmediatamente
      if (isOnline) {
        // Pequeño delay para que el estado se actualice
        setTimeout(processQueue, 100);
      }
    },
    [isOnline, queryClient, processQueue]
  );

  // Limpiar mensajes fallidos
  const clearFailed = useCallback(() => {
    setQueue((prev) => prev.filter((m) => m.status !== "failed"));
  }, []);

  // Reintentar mensajes fallidos
  const retryFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((m) =>
        m.status === "failed"
          ? { ...m, status: "queued" as const, retryCount: 0 }
          : m
      )
    );
    // Procesar después de actualizar estado
    setTimeout(processQueue, 100);
  }, [processQueue]);

  const pendingCount = queue.filter(
    (m) => m.status === "queued" || m.status === "sending"
  ).length;

  return {
    enqueue,
    queue,
    pendingCount,
    isProcessing,
    clearFailed,
    retryFailed,
    isOnline,
  };
}
