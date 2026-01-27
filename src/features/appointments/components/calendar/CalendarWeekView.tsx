import { useMemo, useRef, useEffect } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  format,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CalendarEventCard } from "./CalendarEventCard";
import type { CalendarEvent } from "../../types";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT = 60; // px por hora

export function CalendarWeekView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  weekStartsOn = 1,
  startHour = 7,
  endHour = 21,
}: CalendarWeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Días de la semana
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn });
    const end = endOfWeek(currentDate, { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [currentDate, weekStartsOn]);

  // Horas del día
  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  }, [startHour, endHour]);

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

    return map;
  }, [events]);

  // Scroll a hora actual al montar
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = getHours(now);
      if (currentHour >= startHour && currentHour <= endHour) {
        const scrollPosition = (currentHour - startHour) * HOUR_HEIGHT - 100;
        scrollRef.current.scrollTop = Math.max(0, scrollPosition);
      }
    }
  }, [startHour, endHour]);

  // Calcular posición y altura de un evento
  const getEventStyle = (event: CalendarEvent) => {
    const eventHour = getHours(event.start);
    const eventMinutes = getMinutes(event.start);
    const durationMinutes = differenceInMinutes(event.end, event.start);

    const top = (eventHour - startHour) * HOUR_HEIGHT + (eventMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24);

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  // Línea de tiempo actual
  const nowLineStyle = useMemo(() => {
    const now = new Date();
    const hour = getHours(now);
    const minutes = getMinutes(now);

    if (hour < startHour || hour > endHour) return null;

    const top = (hour - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    return { top: `${top}px` };
  }, [startHour, endHour]);

  const showNowLine = weekDays.some((day) => isToday(day));

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Header con días */}
      <div className="flex border-b bg-muted/30">
        {/* Columna de horas (vacía en header) */}
        <div className="w-16 shrink-0 border-r" />

        {/* Días */}
        {weekDays.map((day) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className="flex-1 border-r last:border-r-0 py-2 text-center"
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE", { locale: es })}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold mt-0.5",
                  dayIsToday &&
                    "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de horas */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex relative" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
          {/* Columna de horas */}
          <div className="w-16 shrink-0 border-r relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-xs text-muted-foreground"
                style={{ top: `${(hour - startHour) * HOUR_HEIGHT - 6}px` }}
              >
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(dayKey) || [];
            const dayIsToday = isToday(day);

            return (
              <div
                key={dayKey}
                className={cn(
                  "flex-1 border-r last:border-r-0 relative",
                  dayIsToday && "bg-primary/5"
                )}
              >
                {/* Líneas de hora */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-dashed border-muted"
                    style={{ top: `${(hour - startHour) * HOUR_HEIGHT}px` }}
                    onClick={() => {
                      const slotDate = new Date(day);
                      slotDate.setHours(hour, 0, 0, 0);
                      onSlotClick?.(slotDate);
                    }}
                  />
                ))}

                {/* Eventos */}
                {dayEvents.map((event) => {
                  const style = getEventStyle(event);
                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5"
                      style={style}
                    >
                      <CalendarEventCard
                        event={event}
                        variant="full"
                        onClick={() => onEventClick?.(event)}
                      />
                    </div>
                  );
                })}

                {/* Línea de tiempo actual */}
                {dayIsToday && showNowLine && nowLineStyle && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                    style={nowLineStyle}
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
