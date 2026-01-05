/**
 * @fileoverview Prefetching Hook for Conversations
 * @description Prefetch conversation details and messages on hover
 * @performance Cache hit rate objetivo > 80%
 */

import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { listMessages } from '../services/conversation.service';

export function usePrefetchConversation() {
  const queryClient = useQueryClient();
  const { scope } = useProfile();

  const prefetchConversation = (conversationId: string) => {
    if (!scope) return;

    // Prefetch messages de la conversación
    queryClient.prefetchQuery({
      queryKey: ['conversation-messages', conversationId],
      queryFn: async () => {
        const result = await listMessages({ conversationId });
        // Invertir mensajes como lo hace el hook principal
        return {
          ...result,
          messages: [...result.messages].reverse(),
        };
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
