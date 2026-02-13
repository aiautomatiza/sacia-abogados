import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useProfile } from "@/hooks/useProfile";
import { listConversations } from "../services/conversation.service";
import * as conversationsApi from "@/lib/api/endpoints/conversations.api";
import type { ConversationFilters } from "../types";

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';
const PAGE_SIZE = 30;

export function useInfiniteConversations(filters: ConversationFilters = {}) {
  const queryClient = useQueryClient();
  const { user, scope } = useAuth();
  const { tenantId } = useProfile();

  // When user has a comercial role, bypass API gateway (it lacks comercial filtering)
  const useGateway = USE_API_GATEWAY && !scope?.comercialRole;

  const query = useInfiniteQuery({
    queryKey: ["conversations", "infinite", tenantId, scope?.comercialRole, filters],
    queryFn: async ({ pageParam = 1 }) => {
      if (useGateway) {
        // API Gateway
        return await conversationsApi.getConversations(filters, pageParam, PAGE_SIZE);
      } else {
        // Direct Supabase (with comercial role filtering)
        if (!tenantId || !user?.id) {
          throw new Error("No tenant ID or user ID found");
        }
        return await listConversations({
          scope: scope ?? { userId: user.id, tenantId, isSuperAdmin: false, comercialRole: null, locationId: null },
          filters,
          page: pageParam,
          pageSize: PAGE_SIZE,
        });
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: useGateway ? true : (!!tenantId && !!user?.id),
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
