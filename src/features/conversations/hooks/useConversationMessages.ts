/**
 * @fileoverview Hook para obtener mensajes de una conversación
 * @performance TIER S: Ordenamiento garantizado ASC en cliente
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMessages } from "../services/conversation.service";
import * as conversationsApi from "@/lib/api/endpoints/conversations.api";
import { useAuth } from "@/contexts/auth-context";
import type { MessageWithSender } from "../types";

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useConversationMessages(conversationId: string | null) {
  const { scope } = useAuth();

  const query = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !scope) {
        return { messages: [], total: 0, page: 1, pageSize: 100, totalPages: 0 };
      }

      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return await conversationsApi.getMessages(conversationId);
      } else {
        // OLD: Direct Supabase
        return await listMessages({ conversationId, scope });
      }
    },
    enabled: !!conversationId && !!scope,
    staleTime: 10 * 1000, // 10s - Realtime maneja nuevos mensajes
    refetchOnWindowFocus: false, // Realtime ya maneja updates
  });

  // Garantizar orden ASC (más antiguos primero) independiente de la fuente
  const sortedMessages = useMemo(() => {
    const msgs = query.data?.messages || [];
    if (msgs.length <= 1) return msgs;

    // Ordenar por created_at ascendente (más antiguo primero, más reciente al final)
    return [...msgs].sort((a: MessageWithSender, b: MessageWithSender) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [query.data?.messages]);

  return {
    messages: sortedMessages,
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
