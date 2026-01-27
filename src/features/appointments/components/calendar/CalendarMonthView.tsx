import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarEventCard, CalendarEventDot } from "./CalendarEventCard";
import type { CalendarEvent } from "../../types";

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  maxEventsPerDay?: number;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarMonthView({
  currentDate,
  events,
  onEventClick,
  onDateClick,
  weekStartsOn = 1,
  maxEventsPerDay = 3,
}: CalendarMonthViewProps) {
  // Calcular días del mes incluyendo días de semanas incompletas
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, weekStartsOn]);

  // Agrupar eventos por día
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      const key = format(event.start, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });

    // Ordenar eventos por hora
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return map;
  }, [events]);

  // Agrupar días en semanas
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="flex flex-col h-full">
      {/* Header con días de la semana */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(100px,1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isToday(day);
              const hasMoreEvents = dayEvents.length > maxEventsPerDay;
              const visibleEvents = dayEvents.slice(0, maxEventsPerDay);
              const hiddenCount = dayEvents.length - maxEventsPerDay;

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "min-h-[100px] border-r last:border-r-0 p-1",
                    !isCurrentMonth && "bg-muted/30",
                    "hover:bg-muted/50 cursor-pointer transition-colors"
                  )}
                  onClick={() => onDateClick?.(day)}
                >
                  {/* Número del día */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={cn(
                        "text-sm w-7 h-7 flex items-center justify-center rounded-full",
                        !isCurrentMonth && "text-muted-foreground",
                        isSelected && "bg-primary text-primary-foreground font-bold"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Eventos */}
                  <div className="space-y-1">
                    {visibleEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      >
                        <CalendarEventCard event={event} variant="compact" />
                      </div>
                    ))}

                    {/* Indicador de más eventos */}
                    {hasMoreEvents && (
                      <button
                        className="w-full text-xs text-muted-foreground hover:text-foreground py-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDateClick?.(day);
                        }}
                      >
                        +{hiddenCount} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
