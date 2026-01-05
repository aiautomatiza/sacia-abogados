/**
 * @fileoverview Calls Preferences Hook
 * @description User preferences (density, visible columns) with SSR-safe persistence
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type { CallPreferences } from "../types/call.types";

const STORAGE_KEY = "calls-preferences";

const DEFAULT_VISIBLE_COLUMNS = [
  "call_datetime",
  "contact_name",
  "contact_phone",
  "type",
  "state",
  "duration_seconds",
  "summary",
];

const DEFAULT_PREFERENCES: CallPreferences = {
  density: "compact",
  visibleColumns: DEFAULT_VISIBLE_COLUMNS,
};

function loadPreferencesFromStorage(): CallPreferences | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return null;
  }
}

function savePreferencesToStorage(preferences: CallPreferences): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function useCallsPreferences() {
  // SSR-safe: Initialize with defaults, hydrate from localStorage in useEffect
  const [isHydrated, setIsHydrated] = useState(false);
  const [preferences, setPreferencesState] = useState<CallPreferences>(DEFAULT_PREFERENCES);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = loadPreferencesFromStorage();
    if (stored) {
      setPreferencesState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persist preferences to localStorage when they change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      savePreferencesToStorage(preferences);
    }
  }, [preferences, isHydrated]);

  const setDensity = useCallback((density: "comfortable" | "compact") => {
    setPreferencesState((prev) => ({ ...prev, density }));
  }, []);

  const setVisibleColumns = useCallback((visibleColumns: string[]) => {
    setPreferencesState((prev) => ({ ...prev, visibleColumns }));
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    setPreferencesState((prev) => {
      const isVisible = prev.visibleColumns.includes(columnId);
      return {
        ...prev,
        visibleColumns: isVisible
          ? prev.visibleColumns.filter((id) => id !== columnId)
          : [...prev.visibleColumns, columnId],
      };
    });
  }, []);

  const isColumnVisible = useCallback(
    (columnId: string) => preferences.visibleColumns.includes(columnId),
    [preferences.visibleColumns]
  );

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Memoized column visibility map for efficient lookups
  const columnVisibilityMap = useMemo(
    () =>
      preferences.visibleColumns.reduce<Record<string, boolean>>(
        (acc, col) => ({ ...acc, [col]: true }),
        {}
      ),
    [preferences.visibleColumns]
  );

  return {
    density: preferences.density,
    visibleColumns: preferences.visibleColumns,
    columnVisibilityMap,
    isHydrated,
    setDensity,
    setVisibleColumns,
    toggleColumn,
    isColumnVisible,
    resetPreferences,
  };
}
