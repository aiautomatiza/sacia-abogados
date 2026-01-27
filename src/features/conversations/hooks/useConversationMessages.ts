/**
 * @fileoverview Hook para obtener mensajes de una conversación
 * @performance TIER S: Sin .reverse() - ordenamiento ASC desde servidor
 */

import { useQuery } from "@tanstack/react-query";
import { listMessages } from "../services/conversation.service";
import * as conversationsApi from "@/lib/api/endpoints/conversations.api";
import { useProfile } from "@/hooks/useProfile";

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useConversationMessages(conversationId: string | null) {
  const { scope } = useProfile();

  const query = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !scope) {
        return { messages: [], total: 0, page: 1, pageSize: 100, totalPages: 0 };
      }

      if (USE_API_GATEWAY) {
        // NEW: API Gateway - TIER S: Sin .reverse(), servidor retorna ASC
        return await conversationsApi.getMessages(conversationId);
      } else {
        // OLD: Direct Supabase - TIER S: Sin .reverse(), servidor retorna ASC
        return await listMessages({ conversationId, scope });
      }
    },
    enabled: !!conversationId && !!scope,
    staleTime: 10 * 1000, // 10s - Realtime maneja nuevos mensajes
    refetchOnWindowFocus: false, // Realtime ya maneja updates
  });

  return {
    messages: query.data?.messages || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
