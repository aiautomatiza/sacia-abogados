/**
 * @fileoverview Calls Filters Hook
 * @description Filter state management with localStorage persistence and SSR safety
 */

import { useState, useCallback, useEffect, useDeferredValue, useMemo } from "react";
import type { CallFilters, CallState, CallType } from "../types/call.types";

const STORAGE_KEY = "calls-filters";

const DEFAULT_FILTERS: CallFilters = {
  search: "",
  date_from: null,
  date_to: null,
  states: [],
  types: [],
};

function loadFiltersFromStorage(): CallFilters | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      date_from: parsed.date_from ? new Date(parsed.date_from) : null,
      date_to: parsed.date_to ? new Date(parsed.date_to) : null,
    };
  } catch {
    return null;
  }
}

function saveFiltersToStorage(filters: CallFilters): void {
  if (typeof window === "undefined") return;
  
  try {
    const toStore = {
      ...filters,
      date_from: filters.date_from?.toISOString() || null,
      date_to: filters.date_to?.toISOString() || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function useCallsFilters() {
  // SSR-safe: Initialize with defaults, hydrate from localStorage in useEffect
  const [isHydrated, setIsHydrated] = useState(false);
  const [filters, setFiltersState] = useState<CallFilters>(DEFAULT_FILTERS);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = loadFiltersFromStorage();
    if (stored) {
      setFiltersState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persist filters to localStorage when they change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveFiltersToStorage(filters);
    }
  }, [filters, isHydrated]);

  // Debounced search value for queries
  const deferredSearch = useDeferredValue(filters.search);

  // Memoized filters with debounced search for queries
  const deferredFilters = useMemo<CallFilters>(
    () => ({
      ...filters,
      search: deferredSearch,
    }),
    [filters, deferredSearch]
  );

  const setFilters = useCallback((newFilters: Partial<CallFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFiltersState((prev) => ({ ...prev, search }));
  }, []);

  const setDateRange = useCallback((date_from: Date | null, date_to: Date | null) => {
    setFiltersState((prev) => ({ ...prev, date_from, date_to }));
  }, []);

  const toggleState = useCallback((state: CallState) => {
    setFiltersState((prev) => {
      const states = prev.states || [];
      const newStates = states.includes(state)
        ? states.filter((s) => s !== state)
        : [...states, state];
      return { ...prev, states: newStates };
    });
  }, []);

  const setStates = useCallback((states: CallState[]) => {
    setFiltersState((prev) => ({ ...prev, states }));
  }, []);

  const toggleType = useCallback((type: CallType) => {
    setFiltersState((prev) => {
      const types = prev.types || [];
      const newTypes = types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type];
      return { ...prev, types: newTypes };
    });
  }, []);

  const setTypes = useCallback((types: CallType[]) => {
    setFiltersState((prev) => ({ ...prev, types }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.date_from ||
          filters.date_to ||
          (filters.states && filters.states.length > 0) ||
          (filters.types && filters.types.length > 0)
      ),
    [filters]
  );

  // Check if search is being debounced
  const isSearchPending = filters.search !== deferredSearch;

  return {
    // Raw filters (for UI display)
    filters,
    // Debounced filters (for queries)
    deferredFilters,
    // Hydration state
    isHydrated,
    // Search debounce state
    isSearchPending,
    // Setters
    setFilters,
    setSearch,
    setDateRange,
    toggleState,
    setStates,
    toggleType,
    setTypes,
    resetFilters,
    hasActiveFilters,
  };
}
