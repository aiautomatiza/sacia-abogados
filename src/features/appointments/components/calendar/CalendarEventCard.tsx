import { Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CalendarEvent, AppointmentStatus } from "../../types";

interface CalendarEventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  variant?: "compact" | "full";
  showTime?: boolean;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200",
  confirmed: "bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200",
  in_progress: "bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200",
  completed: "bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-300",
  cancelled: "bg-red-100 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200 line-through opacity-60",
  no_show: "bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-200",
  rescheduled: "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-200 opacity-60",
};

export function CalendarEventCard({
  event,
  onClick,
  variant = "compact",
  showTime = true,
}: CalendarEventCardProps) {
  const Icon = event.type === "call" ? Phone : MapPin;
  const isCompact = variant === "compact";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded border-l-4 cursor-pointer transition-all hover:shadow-md",
        STATUS_COLORS[event.status],
        isCompact ? "px-2 py-1 text-xs" : "p-2 text-sm"
      )}
    >
      {/* Fila principal */}
      <div className="flex items-start gap-1">
        <Icon className={cn("shrink-0 mt-0.5", isCompact ? "h-3 w-3" : "h-4 w-4")} />
        <div className="flex-1 min-w-0">
          {showTime && (
            <span className={cn("font-medium", isCompact ? "text-[10px]" : "text-xs")}>
              {format(event.start, "HH:mm", { locale: es })}
            </span>
          )}
          <p className={cn("font-medium truncate", isCompact && "leading-tight")}>
            {event.contact_name || event.contact_phone || "Sin nombre"}
          </p>
        </div>
      </div>

      {/* Info adicional (solo en vista full) */}
      {!isCompact && (
        <div className="mt-1 space-y-0.5">
          {event.title && (
            <p className="text-xs opacity-80 truncate">{event.title}</p>
          )}
          <p className="text-xs opacity-70">
            {event.type === "call"
              ? event.agent_email || "Sin asignar"
              : event.location_name || "Sin sede"}
          </p>
        </div>
      )}
    </div>
  );
}

// Versión mini para cuando hay muchos eventos en un día
export function CalendarEventDot({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: () => void;
}) {
  const dotColor = event.status === "cancelled" || event.status === "rescheduled"
    ? "bg-gray-400"
    : event.type === "call"
      ? "bg-blue-500"
      : "bg-purple-500";

  return (
    <div
      onClick={onClick}
      className={cn(
        "h-2 w-2 rounded-full cursor-pointer hover:scale-125 transition-transform",
        dotColor
      )}
      title={`${format(event.start, "HH:mm")} - ${event.contact_name || event.contact_phone}`}
    />
  );
}
