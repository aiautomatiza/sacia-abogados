import { useState, useCallback } from "react";
import type { AppointmentSortConfig, AppointmentDetailed } from "../types";

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_SORT: AppointmentSortConfig = {
  sortBy: "scheduled_at",
  sortOrder: "desc",
};

// Columnas que soportan sorting
export const SORTABLE_COLUMNS: (keyof AppointmentDetailed)[] = [
  "scheduled_at",
  "status",
  "type",
  "contact_name",
  "created_at",
  "duration_minutes",
];

// ============================================================================
// Hook: useAppointmentsSorting
// ============================================================================

interface UseAppointmentsSortingOptions {
  initialSort?: AppointmentSortConfig;
}

export function useAppointmentsSorting({
  initialSort = DEFAULT_SORT,
}: UseAppointmentsSortingOptions = {}) {
  const [sort, setSortState] = useState<AppointmentSortConfig>(initialSort);

  // ============================================================================
  // Setters
  // ============================================================================

  const setSort = useCallback((newSort: AppointmentSortConfig) => {
    setSortState(newSort);
  }, []);

  const setSortBy = useCallback((sortBy: keyof AppointmentDetailed) => {
    setSortState((prev) => ({ ...prev, sortBy }));
  }, []);

  const setSortOrder = useCallback((sortOrder: "asc" | "desc") => {
    setSortState((prev) => ({ ...prev, sortOrder }));
  }, []);

  // Toggle sort: si es la misma columna, alterna orden; si es diferente, usa desc
  const toggleSort = useCallback((column: keyof AppointmentDetailed) => {
    setSortState((prev) => {
      if (prev.sortBy === column) {
        return {
          ...prev,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      return {
        sortBy: column,
        sortOrder: "desc",
      };
    });
  }, []);

  // ============================================================================
  // Helpers
  // ============================================================================

  const isSortedBy = useCallback(
    (column: keyof AppointmentDetailed) => sort.sortBy === column,
    [sort.sortBy]
  );

  const getSortDirection = useCallback(
    (column: keyof AppointmentDetailed): "asc" | "desc" | null => {
      if (sort.sortBy === column) {
        return sort.sortOrder;
      }
      return null;
    },
    [sort.sortBy, sort.sortOrder]
  );

  const isSortable = useCallback(
    (column: keyof AppointmentDetailed) =>
      SORTABLE_COLUMNS.includes(column),
    []
  );

  // ============================================================================
  // Reset
  // ============================================================================

  const resetSort = useCallback(() => {
    setSortState(initialSort);
  }, [initialSort]);

  return {
    // Estado
    sort,

    // Setters
    setSort,
    setSortBy,
    setSortOrder,
    toggleSort,

    // Helpers
    isSortedBy,
    getSortDirection,
    isSortable,

    // Columnas disponibles
    sortableColumns: SORTABLE_COLUMNS,

    // Reset
    resetSort,
  };
}
