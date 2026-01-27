import { useState, useCallback, useMemo } from "react";

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// ============================================================================
// Hook: useAppointmentsPagination
// ============================================================================

interface UseAppointmentsPaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function useAppointmentsPagination({
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: UseAppointmentsPaginationOptions = {}) {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // ============================================================================
  // Setters
  // ============================================================================

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    // Resetear a primera pagina cuando cambia el tamaño
    setPageState(1);
  }, []);

  // ============================================================================
  // Navegacion
  // ============================================================================

  const goToFirst = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLast = useCallback((totalCount: number) => {
    const totalPages = Math.ceil(totalCount / pageSize);
    setPageState(totalPages);
  }, [pageSize]);

  const goToNext = useCallback((totalCount: number) => {
    const totalPages = Math.ceil(totalCount / pageSize);
    setPageState((prev) => Math.min(prev + 1, totalPages));
  }, [pageSize]);

  const goToPrevious = useCallback(() => {
    setPageState((prev) => Math.max(prev - 1, 1));
  }, []);

  // ============================================================================
  // Informacion de paginacion
  // ============================================================================

  const getPaginationInfo = useCallback(
    (totalCount: number) => {
      const totalPages = Math.ceil(totalCount / pageSize);
      return {
        page,
        pageSize,
        totalCount,
        totalPages,
        from: totalCount === 0 ? 0 : (page - 1) * pageSize + 1,
        to: Math.min(page * pageSize, totalCount),
        canGoFirst: page > 1,
        canGoPrevious: page > 1,
        canGoNext: page < totalPages,
        canGoLast: page < totalPages,
        isEmpty: totalCount === 0,
      };
    },
    [page, pageSize]
  );

  // ============================================================================
  // Reset
  // ============================================================================

  const resetPagination = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    // Estado
    page,
    pageSize,

    // Setters
    setPage,
    setPageSize,

    // Navegacion
    goToFirst,
    goToLast,
    goToNext,
    goToPrevious,

    // Info
    getPaginationInfo,

    // Opciones
    pageSizeOptions: PAGE_SIZE_OPTIONS,

    // Reset
    resetPagination,
  };
}
