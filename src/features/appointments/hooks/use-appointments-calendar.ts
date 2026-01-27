import { useState, useCallback, useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isSameDay,
  isSameWeek,
  isSameMonth,
  format,
} from "date-fns";
import { es } from "date-fns/locale";

// ============================================================================
// Tipos
// ============================================================================

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Hook: useAppointmentsCalendarState
// Gestiona el estado de navegacion del calendario
// ============================================================================

interface UseAppointmentsCalendarStateOptions {
  initialView?: CalendarView;
  initialDate?: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Lunes
}

export function useAppointmentsCalendarState({
  initialView = "week",
  initialDate = new Date(),
  weekStartsOn = 1, // Lunes por defecto
}: UseAppointmentsCalendarStateOptions = {}) {
  const [view, setViewState] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ============================================================================
  // Calcular rango visible segun la vista
  // ============================================================================

  const visibleRange = useMemo<CalendarRange>(() => {
    switch (view) {
      case "month":
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case "week":
        return {
          start: startOfWeek(currentDate, { weekStartsOn }),
          end: endOfWeek(currentDate, { weekStartsOn }),
        };
      case "day":
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
        };
      case "agenda":
        // Agenda muestra 14 dias hacia adelante
        return {
          start: startOfDay(currentDate),
          end: endOfDay(addDays(currentDate, 13)),
        };
      default:
        return {
          start: startOfWeek(currentDate, { weekStartsOn }),
          end: endOfWeek(currentDate, { weekStartsOn }),
        };
    }
  }, [view, currentDate, weekStartsOn]);

  // ============================================================================
  // Navegacion
  // ============================================================================

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      switch (view) {
        case "month":
          return addMonths(prev, 1);
        case "week":
          return addWeeks(prev, 1);
        case "day":
        case "agenda":
          return addDays(prev, 1);
        default:
          return addWeeks(prev, 1);
      }
    });
  }, [view]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      switch (view) {
        case "month":
          return subMonths(prev, 1);
        case "week":
          return subWeeks(prev, 1);
        case "day":
        case "agenda":
          return subDays(prev, 1);
        default:
          return subWeeks(prev, 1);
      }
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // ============================================================================
  // Cambiar vista
  // ============================================================================

  const setView = useCallback((newView: CalendarView) => {
    setViewState(newView);
  }, []);

  // ============================================================================
  // Seleccion de fecha/slot
  // ============================================================================

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // ============================================================================
  // Titulo formateado para el header
  // ============================================================================

  const title = useMemo(() => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: es });
      case "week": {
        const start = startOfWeek(currentDate, { weekStartsOn });
        const end = endOfWeek(currentDate, { weekStartsOn });
        if (start.getMonth() === end.getMonth()) {
          return `${format(start, "d", { locale: es })} - ${format(
            end,
            "d 'de' MMMM yyyy",
            { locale: es }
          )}`;
        }
        return `${format(start, "d MMM", { locale: es })} - ${format(
          end,
          "d MMM yyyy",
          { locale: es }
        )}`;
      }
      case "day":
        return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es });
      case "agenda":
        return `Agenda - ${format(currentDate, "d 'de' MMMM", { locale: es })}`;
      default:
        return format(currentDate, "MMMM yyyy", { locale: es });
    }
  }, [view, currentDate, weekStartsOn]);

  // ============================================================================
  // Helpers
  // ============================================================================

  const isToday = useMemo(
    () => isSameDay(currentDate, new Date()),
    [currentDate]
  );

  const isCurrentWeek = useMemo(
    () => isSameWeek(currentDate, new Date(), { weekStartsOn }),
    [currentDate, weekStartsOn]
  );

  const isCurrentMonth = useMemo(
    () => isSameMonth(currentDate, new Date()),
    [currentDate]
  );

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Estado
    view,
    currentDate,
    selectedDate,
    visibleRange,
    title,

    // Navegacion
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,

    // Vista
    setView,

    // Seleccion
    selectDate,
    clearSelection,

    // Helpers
    isToday,
    isCurrentWeek,
    isCurrentMonth,
    weekStartsOn,
  };
}
