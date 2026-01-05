/**
 * @fileoverview Prefetch Calls Hook
 * @description Prefetching for navigation optimization
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { callsRepo } from "../lib/repos/calls.repo";
import { CALLS_QUERY_KEY } from "./use-calls-data";
import { useProfile } from "@/hooks/useProfile";
import type { CallFilters, CallSortConfig } from "../types/call.types";

interface UsePrefetchCallsOptions {
  filters: CallFilters;
  currentPage: number;
  pageSize: number;
  sort: CallSortConfig;
  totalPages: number;
}

export function usePrefetchCalls({
  filters,
  currentPage,
  pageSize,
  sort,
  totalPages,
}: UsePrefetchCallsOptions) {
  const queryClient = useQueryClient();
  const { tenantId } = useProfile();

  const prefetchNextPage = useCallback(() => {
    if (currentPage < totalPages && tenantId) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: [CALLS_QUERY_KEY, tenantId, filters, nextPage, pageSize, sort],
        queryFn: () => callsRepo.listCalls(filters, nextPage, pageSize, sort),
        staleTime: 30000,
      });
    }
  }, [queryClient, filters, currentPage, pageSize, sort, totalPages, tenantId]);

  const prefetchPreviousPage = useCallback(() => {
    if (currentPage > 1 && tenantId) {
      const prevPage = currentPage - 1;
      queryClient.prefetchQuery({
        queryKey: [CALLS_QUERY_KEY, tenantId, filters, prevPage, pageSize, sort],
        queryFn: () => callsRepo.listCalls(filters, prevPage, pageSize, sort),
        staleTime: 30000,
      });
    }
  }, [queryClient, filters, currentPage, pageSize, sort, tenantId]);

  const prefetchCall = useCallback(
    (callId: string) => {
      if (tenantId) {
        queryClient.prefetchQuery({
          queryKey: [CALLS_QUERY_KEY, "detail", tenantId, callId],
          queryFn: () => callsRepo.getCallById(callId),
          staleTime: 60000,
        });
      }
    },
    [queryClient, tenantId]
  );

  return {
    prefetchNextPage,
    prefetchPreviousPage,
    prefetchCall,
  };
}
