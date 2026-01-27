/**
 * @fileoverview Prefetching Hook for Conversations
 * @description Prefetch conversation details and messages on hover
 * @performance TIER S: Cache hit rate objetivo > 80%, sin .reverse()
 */

import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { listMessages } from '../services/conversation.service';
import * as conversationsApi from '@/lib/api/endpoints/conversations.api';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function usePrefetchConversation() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  const prefetchConversation = (conversationId: string) => {
    if (!USE_API_GATEWAY && !scope) return;

    // Prefetch messages de la conversación
    queryClient.prefetchQuery({
      queryKey: ['conversation-messages', conversationId],
      queryFn: async () => {
        if (USE_API_GATEWAY) {
          // NEW: API Gateway - TIER S: Sin .reverse(), servidor retorna ASC
          return await conversationsApi.getMessages(conversationId);
        } else {
          // OLD: Direct Supabase - TIER S: Sin .reverse(), servidor retorna ASC
          return await listMessages({ conversationId });
        }
      },
      staleTime: 10 * 1000, // 10s - mismo que el hook principal
    });

    // También podríamos prefetch la conversación individual si tuviéramos ese endpoint
    // queryClient.prefetchQuery({
    //   queryKey: ['conversation', conversationId],
    //   queryFn: () => getConversationById(conversationId, scope),
    //   staleTime: 30 * 1000,
    // });
  };

  return { prefetchConversation };
}
