/**
 * @fileoverview Appointment Indicator
 * @description Indicador visual de cita próxima. Muestra tooltip con detalles.
 */

import { CalendarCheck, CalendarClock } from "lucide-react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useContactAppointments } from "../../hooks/use-appointments-data";
import type { AppointmentDetailed } from "../../types";

interface AppointmentIndicatorProps {
  contactId: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  onClick?: (appointment: AppointmentDetailed) => void;
}

export function AppointmentIndicator({
  contactId,
  size = "md",
  showTooltip = true,
  onClick,
}: AppointmentIndicatorProps) {
  const { data: appointments } = useContactAppointments(contactId, 1);

  // Si no hay citas próximas, no mostrar nada
  if (!appointments || appointments.length === 0) {
    return null;
  }

  const nextAppointment = appointments[0];
  const scheduledDate = new Date(nextAppointment.scheduled_at);
  const now = new Date();

  // Calcular tiempo hasta la cita
  const hoursUntil = differenceInHours(scheduledDate, now);
  const minutesUntil = differenceInMinutes(scheduledDate, now);

  // Determinar urgencia
  const isUrgent = hoursUntil < 2 && hoursUntil >= 0;
  const isSoon = hoursUntil < 24 && hoursUntil >= 0;
  const isPast = hoursUntil < 0;

  // Formatear tiempo restante
  let timeLabel: string;
  if (isPast) {
    timeLabel = "En curso o pasada";
  } else if (minutesUntil < 60) {
    timeLabel = `En ${minutesUntil} min`;
  } else if (hoursUntil < 24) {
    timeLabel = `En ${hoursUntil}h`;
  } else {
    timeLabel = format(scheduledDate, "d MMM", { locale: es });
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const Icon = isUrgent ? CalendarClock : CalendarCheck;

  const indicator = (
    <div
      onClick={() => onClick?.(nextAppointment)}
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer",
        isUrgent && "text-orange-600 dark:text-orange-400",
        isSoon && !isUrgent && "text-blue-600 dark:text-blue-400",
        !isSoon && !isUrgent && "text-muted-foreground",
        onClick && "hover:opacity-80"
      )}
    >
      <Icon className={cn(sizeClasses[size], isUrgent && "animate-pulse")} />
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">
              {nextAppointment.type === "call" ? "Llamada" : "Presencial"} -{" "}
              {timeLabel}
            </p>
            <p className="text-muted-foreground">
              {format(scheduledDate, "EEEE d MMM, HH:mm", { locale: es })}
            </p>
            {nextAppointment.title && (
              <p className="text-muted-foreground truncate max-w-[200px]">
                {nextAppointment.title}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
