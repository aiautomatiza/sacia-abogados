/**
 * @fileoverview Calls Sorting Hook
 * @description Sorting state management
 */

import { useState, useCallback } from "react";
import type { CallSortConfig, CallDetailed } from "../types/call.types";

const DEFAULT_SORT: CallSortConfig = {
  sortBy: "call_datetime",
  sortOrder: "desc",
};

export function useCallsSorting(initialSort: Partial<CallSortConfig> = {}) {
  const [sort, setSortState] = useState<CallSortConfig>({
    ...DEFAULT_SORT,
    ...initialSort,
  });

  const setSorting = useCallback((sortBy: keyof CallDetailed, sortOrder?: "asc" | "desc") => {
    setSortState((prev) => {
      // If same column, toggle order
      if (prev.sortBy === sortBy && !sortOrder) {
        return {
          sortBy,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      // New column or explicit order
      return {
        sortBy,
        sortOrder: sortOrder || "desc",
      };
    });
  }, []);

  const toggleSort = useCallback((sortBy: keyof CallDetailed) => {
    setSortState((prev) => {
      if (prev.sortBy === sortBy) {
        return {
          sortBy,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      return {
        sortBy,
        sortOrder: "desc",
      };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortState(DEFAULT_SORT);
  }, []);

  return {
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    sort,
    setSorting,
    toggleSort,
    resetSort,
  };
}
