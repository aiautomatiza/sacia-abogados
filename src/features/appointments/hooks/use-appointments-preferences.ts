import { useState, useCallback, useEffect } from "react";

// ============================================================================
// Tipos
// ============================================================================

export type TableDensity = "compact" | "normal" | "comfortable";
export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export interface AppointmentsPreferences {
  // Vista de tabla
  tableDensity: TableDensity;
  showContactPhone: boolean;
  showDuration: boolean;

  // Vista de calendario
  calendarViewMode: CalendarViewMode;
  calendarStartHour: number; // 0-23
  calendarEndHour: number; // 0-23
  showWeekends: boolean;

  // General
  defaultView: "table" | "calendar";
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // segundos

  // Notificaciones
  showUpcomingBanner: boolean;
  upcomingThresholdMinutes: number;
}

// ============================================================================
// Constantes
// ============================================================================

const STORAGE_KEY = "appointments-preferences";

const DEFAULT_PREFERENCES: AppointmentsPreferences = {
  // Vista de tabla
  tableDensity: "normal",
  showContactPhone: true,
  showDuration: true,

  // Vista de calendario
  calendarViewMode: "week",
  calendarStartHour: 8,
  calendarEndHour: 20,
  showWeekends: false,

  // General
  defaultView: "table",
  autoRefreshEnabled: true,
  autoRefreshInterval: 60,

  // Notificaciones
  showUpcomingBanner: true,
  upcomingThresholdMinutes: 30,
};

// ============================================================================
// Helpers para localStorage
// ============================================================================

function loadPreferencesFromStorage(): AppointmentsPreferences | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AppointmentsPreferences;
  } catch {
    return null;
  }
}

function savePreferencesToStorage(preferences: AppointmentsPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignorar errores de localStorage
  }
}

// ============================================================================
// Hook: useAppointmentsPreferences
// ============================================================================

export function useAppointmentsPreferences() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [preferences, setPreferencesState] = useState<AppointmentsPreferences>(
    DEFAULT_PREFERENCES
  );

  // Hidratacion SSR-safe desde localStorage
  useEffect(() => {
    const stored = loadPreferencesFromStorage();
    if (stored) {
      // Merge con defaults para manejar nuevas propiedades
      setPreferencesState({ ...DEFAULT_PREFERENCES, ...stored });
    }
    setIsHydrated(true);
  }, []);

  // Persistencia a localStorage
  useEffect(() => {
    if (isHydrated) {
      savePreferencesToStorage(preferences);
    }
  }, [preferences, isHydrated]);

  // ============================================================================
  // Setters
  // ============================================================================

  const setPreference = useCallback(
    <K extends keyof AppointmentsPreferences>(
      key: K,
      value: AppointmentsPreferences[K]
    ) => {
      setPreferencesState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setTableDensity = useCallback((density: TableDensity) => {
    setPreferencesState((prev) => ({ ...prev, tableDensity: density }));
  }, []);

  const setCalendarViewMode = useCallback((mode: CalendarViewMode) => {
    setPreferencesState((prev) => ({ ...prev, calendarViewMode: mode }));
  }, []);

  const setDefaultView = useCallback((view: "table" | "calendar") => {
    setPreferencesState((prev) => ({ ...prev, defaultView: view }));
  }, []);

  const toggleShowContactPhone = useCallback(() => {
    setPreferencesState((prev) => ({
      ...prev,
      showContactPhone: !prev.showContactPhone,
    }));
  }, []);

  const toggleShowDuration = useCallback(() => {
    setPreferencesState((prev) => ({
      ...prev,
      showDuration: !prev.showDuration,
    }));
  }, []);

  const toggleShowWeekends = useCallback(() => {
    setPreferencesState((prev) => ({
      ...prev,
      showWeekends: !prev.showWeekends,
    }));
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setPreferencesState((prev) => ({
      ...prev,
      autoRefreshEnabled: !prev.autoRefreshEnabled,
    }));
  }, []);

  const toggleShowUpcomingBanner = useCallback(() => {
    setPreferencesState((prev) => ({
      ...prev,
      showUpcomingBanner: !prev.showUpcomingBanner,
    }));
  }, []);

  const setCalendarHours = useCallback(
    (startHour: number, endHour: number) => {
      setPreferencesState((prev) => ({
        ...prev,
        calendarStartHour: Math.max(0, Math.min(23, startHour)),
        calendarEndHour: Math.max(1, Math.min(24, endHour)),
      }));
    },
    []
  );

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Estado
    preferences,
    isHydrated,

    // Setters genericos
    setPreference,

    // Setters especificos
    setTableDensity,
    setCalendarViewMode,
    setDefaultView,
    setCalendarHours,

    // Toggles
    toggleShowContactPhone,
    toggleShowDuration,
    toggleShowWeekends,
    toggleAutoRefresh,
    toggleShowUpcomingBanner,

    // Reset
    resetPreferences,

    // Defaults para referencia
    defaults: DEFAULT_PREFERENCES,
  };
}
