/**
 * @fileoverview Appointments Calendar
 * @description Componente principal del calendario de citas.
 * Combina todas las vistas (mes, semana, día, agenda).
 */

import { useMemo, useCallback, useState } from "react";
import { addMonths, subMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointmentsCalendarState } from "../../hooks/use-appointments-calendar";
import { useAppointmentsCalendar } from "../../hooks/use-appointments-data";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarAgendaView } from "./CalendarAgendaView";
import type { CalendarEvent, AppointmentDetailed, AppointmentFilters } from "../../types";

interface AppointmentsCalendarProps {
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date) => void;
  filters?: Partial<AppointmentFilters>;
}

export function AppointmentsCalendar({
  onEventClick,
  onSlotClick,
  filters = {},
}: AppointmentsCalendarProps) {
  const {
    view,
    currentDate,
    visibleRange,
    title,
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,
    setView,
    isToday: isCurrentDateToday,
    weekStartsOn,
  } = useAppointmentsCalendarState();

  // Expandir el rango para precargar datos de meses adyacentes en vista mensual
  const fetchRange = useMemo(() => {
    if (view === "month") {
      return {
        start: subMonths(visibleRange.start, 1),
        end: addMonths(visibleRange.end, 1),
      };
    }
    return visibleRange;
  }, [view, visibleRange]);

  // Fetch de citas
  const {
    data: appointments,
    isLoading,
    isError,
  } = useAppointmentsCalendar({
    startDate: fetchRange.start,
    endDate: fetchRange.end,
    filters,
  });

  // Transformar appointments a CalendarEvent
  const events = useMemo<CalendarEvent[]>(() => {
    if (!appointments) return [];

    return appointments
      .filter((apt) => {
        // Filtrar citas con fechas inválidas
        if (!apt.scheduled_at) return false;
        const start = new Date(apt.scheduled_at);
        return !isNaN(start.getTime());
      })
      .map((apt): CalendarEvent => {
        const start = new Date(apt.scheduled_at);
        // Calcular end: usar scheduled_end_at o calcular desde duration_minutes
        let end: Date;
        if (apt.scheduled_end_at) {
          end = new Date(apt.scheduled_end_at);
          if (isNaN(end.getTime())) {
            // Fallback: calcular desde duración
            end = new Date(start.getTime() + (apt.duration_minutes || 30) * 60 * 1000);
          }
        } else {
          end = new Date(start.getTime() + (apt.duration_minutes || 30) * 60 * 1000);
        }

        return {
          id: apt.id,
          title: apt.title || "",
          start,
          end,
          type: apt.type,
          status: apt.status,
          contact_name: apt.contact_name,
          contact_phone: apt.contact_phone,
          agent_email: apt.agent_email,
          location_name: apt.location_name,
        };
      });
  }, [appointments]);

  // Handler para click en evento
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onEventClick?.(event);
    },
    [onEventClick]
  );

  // Handler para click en slot (crear cita)
  const handleSlotClick = useCallback(
    (date: Date) => {
      onSlotClick?.(date);
    },
    [onSlotClick]
  );

  // Handler para click en fecha (cambiar a vista de día)
  const handleDateClick = useCallback(
    (date: Date) => {
      goToDate(date);
      setView("day");
    },
    [goToDate, setView]
  );

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96 border rounded-lg">
        <p className="text-muted-foreground">Error al cargar el calendario</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Header con navegación */}
      <CalendarHeader
        title={title}
        view={view}
        onViewChange={setView}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
        isToday={isCurrentDateToday}
      />

      {/* Vista del calendario */}
      <div className="flex-1 overflow-hidden">
        {view === "month" && (
          <CalendarMonthView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            weekStartsOn={weekStartsOn}
          />
        )}

        {view === "week" && (
          <CalendarWeekView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            weekStartsOn={weekStartsOn}
          />
        )}

        {view === "day" && (
          <CalendarDayView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}

        {view === "agenda" && (
          <CalendarAgendaView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
          />
        )}
      </div>
    </div>
  );
}

// Skeleton de carga
function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Calendar grid skeleton */}
      <div className="flex-1 border rounded-lg p-4">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
