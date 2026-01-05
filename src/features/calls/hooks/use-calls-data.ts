/**
 * @fileoverview Calls Data Hook
 * @description Fetching with React Query (split queries) with tenant isolation
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callsRepo } from "../lib/repos/calls.repo";
import { useProfile } from "@/hooks/useProfile";
import type { CallFilters, CallSortConfig } from "../types/call.types";

export const CALLS_QUERY_KEY = "calls";
export const CALLS_STATS_QUERY_KEY = "calls-stats";
const DEFAULT_PAGE_SIZE = 20;

interface UseCallsDataOptions {
  filters: CallFilters;
  page: number;
  pageSize?: number;
  sort: CallSortConfig;
  enabled?: boolean;
}

export function useCallsData({
  filters,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  sort,
  enabled = true,
}: UseCallsDataOptions) {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  // Main query for calls list with tenant isolation
  const callsQuery = useQuery({
    queryKey: [CALLS_QUERY_KEY, tenantId, filters, page, pageSize, sort],
    queryFn: () => callsRepo.listCalls(filters, page, pageSize, sort),
    enabled: enabled && !!tenantId,
    staleTime: 30000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });

  // Separate query for stats (doesn't depend on pagination)
  const statsQuery = useQuery({
    queryKey: [CALLS_STATS_QUERY_KEY, tenantId, filters],
    queryFn: () => callsRepo.getCallStats(filters),
    enabled: enabled && !!tenantId,
    staleTime: 60000, // 1 minute
  });

  // Refetch both queries
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: [CALLS_QUERY_KEY, tenantId] });
    queryClient.invalidateQueries({ queryKey: [CALLS_STATS_QUERY_KEY, tenantId] });
  };

  return {
    // Calls data
    calls: callsQuery.data?.data || [],
    totalCount: callsQuery.data?.count || 0,
    isLoading: callsQuery.isLoading,
    isFetching: callsQuery.isFetching,
    isError: callsQuery.isError,
    error: callsQuery.error,

    // Stats data
    stats: statsQuery.data || null,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,

    // Actions
    refetch,
  };
}

/**
 * Hook to fetch a single call by ID with tenant isolation
 */
export function useCallDetail(callId: string | null) {
  const { tenantId } = useProfile();

  return useQuery({
    queryKey: [CALLS_QUERY_KEY, "detail", tenantId, callId],
    queryFn: () => (callId ? callsRepo.getCallById(callId) : null),
    enabled: !!callId && !!tenantId,
    staleTime: 60000,
  });
}

/**
 * Get query keys for invalidation with tenant support
 */
export const callsQueryKeys = {
  all: (tenantId: string | null) => [CALLS_QUERY_KEY, tenantId] as const,
  lists: (tenantId: string | null) => [...callsQueryKeys.all(tenantId), "list"] as const,
  list: (tenantId: string | null, filters: CallFilters) => 
    [...callsQueryKeys.lists(tenantId), filters] as const,
  details: (tenantId: string | null) => [...callsQueryKeys.all(tenantId), "detail"] as const,
  detail: (tenantId: string | null, id: string) => 
    [...callsQueryKeys.details(tenantId), id] as const,
  stats: (tenantId: string | null, filters: CallFilters) => 
    [CALLS_STATS_QUERY_KEY, tenantId, filters] as const,
};
