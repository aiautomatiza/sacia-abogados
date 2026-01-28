import { useState, useCallback, useEffect, useMemo, useDeferredValue } from "react";
import type { AppointmentFilters, AppointmentType, AppointmentStatus } from "../types";

// ============================================================================
// Constantes
// ============================================================================

const STORAGE_KEY = "appointments-filters";

const DEFAULT_FILTERS: AppointmentFilters = {
  search: "",
  date_from: null,
  date_to: null,
  types: [],
  statuses: [],
  location_id: null,
  agent_id: null,
  contact_id: null,
};

// ============================================================================
// Helpers para localStorage
// ============================================================================

function loadFiltersFromStorage(): AppointmentFilters | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Convertir strings de fecha a Date objects
    return {
      ...parsed,
      date_from: parsed.date_from ? new Date(parsed.date_from) : null,
      date_to: parsed.date_to ? new Date(parsed.date_to) : null,
    };
  } catch {
    return null;
  }
}

function saveFiltersToStorage(filters: AppointmentFilters): void {
  try {
    const toStore = {
      ...filters,
      // Convertir Date a ISO string para almacenamiento
      date_from: filters.date_from?.toISOString() ?? null,
      date_to: filters.date_to?.toISOString() ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Ignorar errores de localStorage
  }
}

// ============================================================================
// Hook: useAppointmentsFilters
// ============================================================================

export function useAppointmentsFilters() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [filters, setFiltersState] = useState<AppointmentFilters>(DEFAULT_FILTERS);

  // Hidratacion SSR-safe desde localStorage
  useEffect(() => {
    const stored = loadFiltersFromStorage();
    if (stored) {
      setFiltersState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persistencia a localStorage
  useEffect(() => {
    if (isHydrated) {
      saveFiltersToStorage(filters);
    }
  }, [filters, isHydrated]);

  // Debouncing para busqueda usando useDeferredValue
  const deferredSearch = useDeferredValue(filters.search);
  const deferredFilters = useMemo<AppointmentFilters>(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch]
  );

  // ============================================================================
  // Setters
  // ============================================================================

  const setSearch = useCallback((search: string) => {
    setFiltersState((prev) => ({ ...prev, search }));
  }, []);

  const setDateRange = useCallback(
    (date_from: Date | null, date_to: Date | null) => {
      setFiltersState((prev) => ({ ...prev, date_from, date_to }));
    },
    []
  );

  const setDateFrom = useCallback((date_from: Date | null) => {
    setFiltersState((prev) => ({ ...prev, date_from }));
  }, []);

  const setDateTo = useCallback((date_to: Date | null) => {
    setFiltersState((prev) => ({ ...prev, date_to }));
  }, []);

  const setTypes = useCallback((types: AppointmentType[]) => {
    setFiltersState((prev) => ({ ...prev, types }));
  }, []);

  const toggleType = useCallback((type: AppointmentType) => {
    setFiltersState((prev) => {
      const currentTypes = prev.types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];
      return { ...prev, types: newTypes };
    });
  }, []);

  const setStatuses = useCallback((statuses: AppointmentStatus[]) => {
    setFiltersState((prev) => ({ ...prev, statuses }));
  }, []);

  const toggleStatus = useCallback((status: AppointmentStatus) => {
    setFiltersState((prev) => {
      const currentStatuses = prev.statuses || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((s) => s !== status)
        : [...currentStatuses, status];
      return { ...prev, statuses: newStatuses };
    });
  }, []);

  const setLocationId = useCallback((location_id: string | null) => {
    setFiltersState((prev) => ({ ...prev, location_id }));
  }, []);

  const setAgentId = useCallback((agent_id: string | null) => {
    setFiltersState((prev) => ({ ...prev, agent_id }));
  }, []);

  const setContactId = useCallback((contact_id: string | null) => {
    setFiltersState((prev) => ({ ...prev, contact_id }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const setFilters = useCallback(
    (updater: AppointmentFilters | ((prev: AppointmentFilters) => AppointmentFilters)) => {
      setFiltersState(updater);
    },
    []
  );

  // ============================================================================
  // Computed values
  // ============================================================================

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.search ||
      !!filters.date_from ||
      !!filters.date_to ||
      (filters.types && filters.types.length > 0) ||
      (filters.statuses && filters.statuses.length > 0) ||
      !!filters.location_id ||
      !!filters.agent_id ||
      !!filters.contact_id
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.types && filters.types.length > 0) count++;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (filters.location_id) count++;
    if (filters.agent_id) count++;
    if (filters.contact_id) count++;
    return count;
  }, [filters]);

  return {
    // Estado
    filters,
    deferredFilters,
    isHydrated,

    // Indicadores
    isSearchPending: filters.search !== deferredSearch,
    hasActiveFilters,
    activeFilterCount,

    // Setters
    setSearch,
    setDateRange,
    setDateFrom,
    setDateTo,
    setTypes,
    toggleType,
    setStatuses,
    toggleStatus,
    setLocationId,
    setAgentId,
    setContactId,
    resetFilters,
    setFilters,
  };
}
