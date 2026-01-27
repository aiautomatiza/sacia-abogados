/**
 * @fileoverview Contact Upcoming Appointments Widget
 * @description Muestra las próximas citas de un contacto. Reutilizable en contactos y conversaciones.
 */

import { CalendarDays, Phone, MapPin, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useContactAppointments } from "../../hooks/use-appointments-data";
import { AppointmentStatusBadge } from "../AppointmentStatusBadge";
import type { AppointmentDetailed } from "../../types";

interface ContactUpcomingAppointmentsProps {
  contactId: string;
  limit?: number;
  onCreateClick?: () => void;
  onAppointmentClick?: (appointment: AppointmentDetailed) => void;
  onViewAllClick?: () => void;
  showHeader?: boolean;
  showCreateButton?: boolean;
  compact?: boolean;
}

export function ContactUpcomingAppointments({
  contactId,
  limit = 3,
  onCreateClick,
  onAppointmentClick,
  onViewAllClick,
  showHeader = true,
  showCreateButton = true,
  compact = false,
}: ContactUpcomingAppointmentsProps) {
  const { data: appointments, isLoading } = useContactAppointments(contactId, limit);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {showHeader && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        )}
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const hasAppointments = appointments && appointments.length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            <span>Próximas citas</span>
          </div>
          {showCreateButton && onCreateClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCreateClick}
              title="Programar cita"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Lista de citas */}
      {hasAppointments ? (
        <div className="space-y-2">
          {appointments.map((appointment) => (
            <AppointmentMiniCard
              key={appointment.id}
              appointment={appointment}
              onClick={() => onAppointmentClick?.(appointment)}
              compact={compact}
            />
          ))}

          {/* Ver todas */}
          {onViewAllClick && appointments.length >= limit && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={onViewAllClick}
            >
              Ver todas las citas
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">
            Sin citas programadas
          </p>
          {showCreateButton && onCreateClick && (
            <Button variant="outline" size="sm" onClick={onCreateClick}>
              <Plus className="h-3 w-3 mr-1" />
              Programar cita
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Mini card para mostrar una cita
interface AppointmentMiniCardProps {
  appointment: AppointmentDetailed;
  onClick?: () => void;
  compact?: boolean;
}

function AppointmentMiniCard({
  appointment,
  onClick,
  compact = false,
}: AppointmentMiniCardProps) {
  const Icon = appointment.type === "call" ? Phone : MapPin;
  const scheduledDate = new Date(appointment.scheduled_at);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
        "hover:bg-muted/50 hover:border-primary/30",
        appointment.status === "cancelled" && "opacity-50"
      )}
    >
      {/* Icono de tipo */}
      <div
        className={cn(
          "rounded-full p-1.5 shrink-0",
          appointment.type === "call"
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        )}
      >
        <Icon className="h-3 w-3" />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {format(scheduledDate, "EEE d MMM, HH:mm", { locale: es })}
          </p>
          <AppointmentStatusBadge status={appointment.status} size="xs" />
        </div>

        {!compact && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {appointment.type === "call"
              ? appointment.agent_email || "Sin asignar"
              : appointment.location_name || "Sin sede"}
          </p>
        )}

        {appointment.title && !compact && (
          <p className="text-xs text-muted-foreground truncate">
            {appointment.title}
          </p>
        )}
      </div>
    </div>
  );
}

export { AppointmentMiniCard };
