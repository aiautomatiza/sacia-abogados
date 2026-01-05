/**
 * @fileoverview Calls Pagination Hook
 * @description Controlled pagination state management
 */

import { useState, useCallback, useMemo } from "react";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface UseCallsPaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

/**
 * Hook for managing pagination state
 * totalCount is passed to getPaginationInfo for calculations
 */
export function useCallsPagination({
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: UseCallsPaginationOptions = {}) {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1); // Reset to first page when changing page size
  }, []);

  const goToFirst = useCallback(() => setPageState(1), []);

  const goToNext = useCallback(() => {
    setPageState((prev) => prev + 1);
  }, []);

  const goToPrevious = useCallback(() => {
    setPageState((prev) => Math.max(prev - 1, 1));
  }, []);

  /**
   * Calculate pagination info based on external totalCount
   * This pattern allows totalCount to come from the data query
   */
  const getPaginationInfo = useCallback(
    (totalCount: number) => {
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
      const to = Math.min(page * pageSize, totalCount);
      const canGoNext = page < totalPages;
      const canGoPrevious = page > 1;

      return {
        totalPages,
        totalCount,
        from,
        to,
        canGoNext,
        canGoPrevious,
      };
    },
    [page, pageSize]
  );

  const goToLast = useCallback(
    (totalCount: number) => {
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      setPageState(totalPages);
    },
    [pageSize]
  );

  // Reset page if it exceeds total pages (e.g., after filtering)
  const validatePage = useCallback(
    (totalCount: number) => {
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      if (page > totalPages) {
        setPageState(totalPages);
      }
    },
    [page, pageSize]
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    goToFirst,
    goToLast,
    goToNext,
    goToPrevious,
    getPaginationInfo,
    validatePage,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
}
