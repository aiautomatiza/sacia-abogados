/**
 * @fileoverview Calls Page
 * @description Main orchestrator component for calls module
 */

import { useCallback, useEffect, useMemo } from "react";
import { CallsHeader } from "./CallsHeader";
import { CallsFilters } from "./CallsFilters";
import { CallStatsCards } from "./CallStatsCards";
import { CallsTable } from "./CallsTable";
import { CallsEmpty } from "./CallsEmpty";
import { CallsError } from "./CallsError";
import { CallsPagination } from "./CallsPagination";
import { CallDetailModal } from "./CallDetailModal";
import { useCallsData, useCallDetail } from "../hooks/use-calls-data";
import { useCallsFilters } from "../hooks/use-calls-filters";
import { useCallsPagination } from "../hooks/use-calls-pagination";
import { useCallsSorting } from "../hooks/use-calls-sorting";
import { useCallsPreferences } from "../hooks/use-calls-preferences";
import { usePrefetchCalls } from "../hooks/use-prefetch-calls";
import { useRealtimeCalls } from "../hooks/use-realtime-calls";
import { useCallsUrlState } from "../hooks/use-calls-url-state";
import type { CallDetailed } from "../types/call.types";

export function CallsPage() {
  // URL state management
  const {
    selectedCallId,
    activeTab,
    urlPage,
    setSelectedCallId,
    setActiveTab,
    setUrlPage,
  } = useCallsUrlState();

  // Fetch selected call from URL
  const { data: selectedCall } = useCallDetail(selectedCallId);

  // Hooks for state management
  const {
    filters,
    deferredFilters,
    setSearch,
    setDateRange,
    setStates,
    setTypes,
    resetFilters,
    hasActiveFilters,
    isSearchPending,
  } = useCallsFilters();

  const { sort, toggleSort } = useCallsSorting();
  const { density } = useCallsPreferences();

  // Pagination state (controlled)
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    goToNext,
    goToPrevious,
    goToFirst,
    getPaginationInfo,
    validatePage,
    pageSizeOptions,
  } = useCallsPagination();

  // Sync page from URL on mount
  useEffect(() => {
    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [urlPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when page changes
  useEffect(() => {
    if (page !== urlPage) {
      setUrlPage(page);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data fetching with debounced filters
  const {
    calls,
    totalCount,
    isLoading,
    isFetching,
    isError,
    error,
    stats,
    statsLoading,
    refetch,
  } = useCallsData({
    filters: deferredFilters,
    page,
    pageSize,
    sort,
  });

  // Calculate pagination info from totalCount
  const paginationInfo = useMemo(
    () => getPaginationInfo(totalCount),
    [getPaginationInfo, totalCount]
  );

  // Validate page when totalCount changes
  useEffect(() => {
    validatePage(totalCount);
  }, [totalCount, validatePage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    goToFirst();
  }, [deferredFilters, goToFirst]);

  // Prefetching
  const { prefetchNextPage, prefetchCall } = usePrefetchCalls({
    filters: deferredFilters,
    currentPage: page,
    pageSize,
    sort,
    totalPages: paginationInfo.totalPages,
  });

  // Realtime updates
  const { isConnected, isInitializing } = useRealtimeCalls();

  // Handlers
  const handleRowClick = useCallback(
    (call: CallDetailed) => {
      setSelectedCallId(call.id!);
    },
    [setSelectedCallId]
  );

  const handleRowHover = useCallback(
    (callId: string) => {
      prefetchCall(callId);
    },
    [prefetchCall]
  );

  const handleSort = useCallback(
    (columnId: string) => {
      toggleSort(columnId as keyof CallDetailed);
      goToFirst();
    },
    [toggleSort, goToFirst]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCloseModal = useCallback(() => {
    setSelectedCallId(null);
  }, [setSelectedCallId]);

  const showLoading = isLoading || isSearchPending;

  return (
    <div className="flex flex-col h-full p-6 space-y-6 overflow-y-auto">
      <CallsHeader onRefresh={handleRefresh} isRefreshing={isFetching} isConnected={isConnected} isInitializing={isInitializing} />

      <CallsFilters
        filters={filters}
        onSearchChange={setSearch}
        onDateRangeChange={setDateRange}
        onStatesChange={setStates}
        onTypesChange={setTypes}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isError ? (
        <CallsError error={error} onRetry={refetch} />
      ) : !showLoading && calls.length === 0 ? (
        <CallsEmpty hasFilters={hasActiveFilters} onResetFilters={resetFilters} />
      ) : (
        <>
          <CallsTable
            calls={calls}
            isLoading={showLoading}
            onRowClick={handleRowClick}
            onSort={handleSort}
            onRowHover={handleRowHover}
            density={density}
          />

          <CallsPagination
            currentPage={page}
            totalPages={paginationInfo.totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            from={paginationInfo.from}
            to={paginationInfo.to}
            totalCount={totalCount}
            canGoPrevious={paginationInfo.canGoPrevious}
            canGoNext={paginationInfo.canGoNext}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onPrefetchNext={prefetchNextPage}
          />
        </>
      )}

      {/* Stats cards al final con fondo sidebar */}
      <CallStatsCards stats={stats} isLoading={statsLoading} />

      <CallDetailModal
        call={selectedCall || null}
        open={!!selectedCallId}
        onClose={handleCloseModal}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
