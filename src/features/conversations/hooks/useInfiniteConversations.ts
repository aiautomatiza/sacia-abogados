import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { listConversations } from "../services/conversation.service";
import type { ConversationFilters } from "../types";

const PAGE_SIZE = 30;

export function useInfiniteConversations(filters: ConversationFilters = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useProfile();

  const query = useInfiniteQuery({
    queryKey: ["conversations", "infinite", tenantId, filters],
    queryFn: async ({ pageParam = 1 }) => {
      if (!tenantId || !user?.id) {
        throw new Error("No tenant ID or user ID found");
      }
      return await listConversations({
        scope: { userId: user.id, tenantId, isSuperAdmin: false },
        filters,
        page: pageParam,
        pageSize: PAGE_SIZE,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!tenantId && !!user?.id,
    staleTime: 30 * 1000, // 30s - Con realtime activo, no necesitamos refetch agresivo
    refetchOnWindowFocus: false, // Realtime ya maneja updates
  });

  const conversations = query.data?.pages.flatMap((p) => p.conversations) || [];
  const total = query.data?.pages[0]?.total || 0;

  return {
    conversations,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["conversations", "infinite"],
      }),
  };
}
