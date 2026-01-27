import { useMemo } from "react";
import { format, isSameDay, isToday, isTomorrow, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, MapPin, Clock, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppointmentStatusBadge } from "../AppointmentStatusBadge";
import type { CalendarEvent } from "../../types";

interface CalendarAgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  daysToShow?: number;
}

interface GroupedEvents {
  date: Date;
  label: string;
  events: CalendarEvent[];
}

export function CalendarAgendaView({
  currentDate,
  events,
  onEventClick,
  daysToShow = 14,
}: CalendarAgendaViewProps) {
  // Agrupar eventos por día
  const groupedEvents = useMemo(() => {
    const groups: GroupedEvents[] = [];
    const eventsMap = new Map<string, CalendarEvent[]>();

    // Agrupar por fecha
    events.forEach((event) => {
      const key = format(event.start, "yyyy-MM-dd");
      if (!eventsMap.has(key)) {
        eventsMap.set(key, []);
      }
      eventsMap.get(key)!.push(event);
    });

    // Crear grupos para cada día (incluyendo días sin eventos)
    for (let i = 0; i < daysToShow; i++) {
      const date = addDays(currentDate, i);
      const key = format(date, "yyyy-MM-dd");
      const dayEvents = eventsMap.get(key) || [];

      // Ordenar eventos por hora
      dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Generar etiqueta del día
      let label: string;
      if (isToday(date)) {
        label = "Hoy";
      } else if (isTomorrow(date)) {
        label = "Mañana";
      } else {
        label = format(date, "EEEE d 'de' MMMM", { locale: es });
      }

      // Solo incluir días con eventos o los próximos 3 días
      if (dayEvents.length > 0 || i < 3) {
        groups.push({
          date,
          label,
          events: dayEvents,
        });
      }
    }

    return groups;
  }, [events, currentDate, daysToShow]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin citas programadas</h3>
        <p className="text-muted-foreground max-w-sm">
          No hay citas programadas para los próximos {daysToShow} días.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {groupedEvents.map((group) => (
          <div key={format(group.date, "yyyy-MM-dd")}>
            {/* Encabezado del día */}
            <div
              className={cn(
                "sticky top-0 z-10 bg-background py-2 mb-3 border-b",
                isToday(group.date) && "bg-primary/5"
              )}
            >
              <h3
                className={cn(
                  "font-semibold capitalize",
                  isToday(group.date) && "text-primary"
                )}
              >
                {group.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {format(group.date, "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            {/* Eventos del día */}
            {group.events.length > 0 ? (
              <div className="space-y-3">
                {group.events.map((event) => (
                  <AgendaEventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">
                Sin citas programadas
              </p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Tarjeta de evento para la vista de agenda
function AgendaEventCard({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: () => void;
}) {
  const Icon = event.type === "call" ? Phone : MapPin;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex gap-4 p-4 rounded-lg border cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/50",
        event.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Hora */}
      <div className="shrink-0 text-center">
        <div className="text-2xl font-bold">
          {format(event.start, "HH:mm")}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(event.end, "HH:mm")}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium truncate">
              {event.contact_name || event.contact_phone || "Sin nombre"}
            </span>
          </div>
          <AppointmentStatusBadge status={event.status} size="sm" />
        </div>

        {event.title && (
          <p className="text-sm text-muted-foreground truncate mb-2">
            {event.title}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {/* Duración */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {Math.round(
                (event.end.getTime() - event.start.getTime()) / 60000
              )}{" "}
              min
            </span>
          </div>

          {/* Asignación */}
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>
              {event.type === "call"
                ? event.agent_email || "Sin asignar"
                : event.location_name || "Sin sede"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
