import { useQuery } from "@tanstack/react-query";
import { listMessages } from "../services/conversation.service";
import * as conversationsApi from "@/lib/api/endpoints/conversations.api";

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useConversationMessages(conversationId: string | null) {
  const query = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return { messages: [], total: 0, page: 1, pageSize: 100, totalPages: 0 };
      }

      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const result = await conversationsApi.getMessages(conversationId);
        // Invertir mensajes: la query trae DESC (nuevos primero) pero UI necesita ASC (viejos arriba)
        return {
          ...result,
          messages: [...result.messages].reverse(),
        };
      } else {
        // OLD: Direct Supabase
        const result = await listMessages({ conversationId });
        // Invertir mensajes: la query trae DESC (nuevos primero) pero UI necesita ASC (viejos arriba)
        return {
          ...result,
          messages: [...result.messages].reverse(),
        };
      }
    },
    enabled: !!conversationId,
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
