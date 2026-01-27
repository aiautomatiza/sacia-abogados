import { useMemo, useRef, useEffect } from "react";
import {
  format,
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

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date) => void;
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT = 80; // px por hora (más grande en vista de día)

export function CalendarDayView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  startHour = 7,
  endHour = 21,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Horas del día
  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  }, [startHour, endHour]);

  // Filtrar eventos del día actual
  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = format(event.start, "yyyy-MM-dd");
      const currentDateStr = format(currentDate, "yyyy-MM-dd");
      return eventDate === currentDateStr;
    });
  }, [events, currentDate]);

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
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 40);

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  // Detectar eventos superpuestos y calcular ancho
  const getEventWidth = (event: CalendarEvent, index: number) => {
    // Simplificación: por ahora no manejamos colisiones complejas
    // En un escenario real se calcularía el número de eventos superpuestos
    return {
      width: "calc(100% - 8px)",
      left: "4px",
    };
  };

  // Línea de tiempo actual
  const nowLineStyle = useMemo(() => {
    if (!isToday(currentDate)) return null;

    const now = new Date();
    const hour = getHours(now);
    const minutes = getMinutes(now);

    if (hour < startHour || hour > endHour) return null;

    const top = (hour - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    return { top: `${top}px` };
  }, [currentDate, startHour, endHour]);

  const dayIsToday = isToday(currentDate);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center py-4 border-b bg-muted/30">
        <div className="text-center">
          <div className="text-sm text-muted-foreground uppercase">
            {format(currentDate, "EEEE", { locale: es })}
          </div>
          <div
            className={cn(
              "text-3xl font-bold mt-1",
              dayIsToday &&
                "bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto"
            )}
          >
            {format(currentDate, "d")}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div
          className="flex relative"
          style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
        >
          {/* Columna de horas */}
          <div className="w-20 shrink-0 border-r relative bg-muted/20">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-3 text-sm text-muted-foreground font-medium"
                style={{ top: `${(hour - startHour) * HOUR_HEIGHT - 8}px` }}
              >
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Área de eventos */}
          <div
            className={cn("flex-1 relative", dayIsToday && "bg-primary/5")}
          >
            {/* Líneas de hora */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-muted cursor-pointer hover:bg-muted/30 transition-colors"
                style={{
                  top: `${(hour - startHour) * HOUR_HEIGHT}px`,
                  height: `${HOUR_HEIGHT}px`,
                }}
                onClick={() => {
                  const slotDate = new Date(currentDate);
                  slotDate.setHours(hour, 0, 0, 0);
                  onSlotClick?.(slotDate);
                }}
              >
                {/* Media hora */}
                <div
                  className="absolute w-full border-t border-dashed border-muted/50"
                  style={{ top: `${HOUR_HEIGHT / 2}px` }}
                />
              </div>
            ))}

            {/* Eventos */}
            {dayEvents.map((event, index) => {
              const positionStyle = getEventStyle(event);
              const widthStyle = getEventWidth(event, index);

              return (
                <div
                  key={event.id}
                  className="absolute"
                  style={{ ...positionStyle, ...widthStyle }}
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
            {nowLineStyle && (
              <div
                className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                style={nowLineStyle}
              >
                <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
