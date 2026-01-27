import { format, formatDistance, isToday, isTomorrow, isYesterday, isPast, isFuture, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import type {
  AppointmentDetailed,
  AppointmentType,
  AppointmentStatus,
} from "../types";

// ============================================================================
// Formateo de fechas
// ============================================================================

export function formatAppointmentDate(dateStr: string): string {
  const date = new Date(dateStr);

  if (isToday(date)) {
    return `Hoy, ${format(date, "HH:mm", { locale: es })}`;
  }

  if (isTomorrow(date)) {
    return `Mañana, ${format(date, "HH:mm", { locale: es })}`;
  }

  if (isYesterday(date)) {
    return `Ayer, ${format(date, "HH:mm", { locale: es })}`;
  }

  return format(date, "d 'de' MMMM, HH:mm", { locale: es });
}

export function formatAppointmentDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "d MMM, HH:mm", { locale: es });
}

export function formatAppointmentDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "EEEE d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

export function formatAppointmentTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "HH:mm", { locale: es });
}

export function formatAppointmentTimeRange(
  startStr: string,
  durationMinutes: number
): string {
  const start = new Date(startStr);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  return formatDistance(date, new Date(), { addSuffix: true, locale: es });
}

// ============================================================================
// Formateo de duracion
// ============================================================================

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

// ============================================================================
// Estado de tiempo
// ============================================================================

export function getTimeStatus(
  appointment: AppointmentDetailed
): "upcoming" | "ongoing" | "past" | "cancelled" {
  if (
    appointment.status === "cancelled" ||
    appointment.status === "rescheduled"
  ) {
    return "cancelled";
  }

  const now = new Date();
  const start = new Date(appointment.scheduled_at);
  const end = new Date(appointment.scheduled_end_at);

  if (now < start) {
    return "upcoming";
  }

  if (now >= start && now <= end) {
    return "ongoing";
  }

  return "past";
}

export function getMinutesUntilAppointment(dateStr: string): number {
  const date = new Date(dateStr);
  return differenceInMinutes(date, new Date());
}

export function isAppointmentSoon(dateStr: string, thresholdMinutes = 30): boolean {
  const minutes = getMinutesUntilAppointment(dateStr);
  return minutes > 0 && minutes <= thresholdMinutes;
}

export function isAppointmentOverdue(appointment: AppointmentDetailed): boolean {
  if (appointment.status !== "scheduled" && appointment.status !== "confirmed") {
    return false;
  }

  const now = new Date();
  const start = new Date(appointment.scheduled_at);

  return now > start;
}

// ============================================================================
// Formateo de tipo
// ============================================================================

export function formatAppointmentType(type: AppointmentType): string {
  const labels: Record<AppointmentType, string> = {
    call: "Llamada",
    in_person: "Presencial",
  };
  return labels[type];
}

export function getAppointmentTypeIcon(type: AppointmentType): string {
  return type === "call" ? "phone" : "map-pin";
}

// ============================================================================
// Formateo de estado
// ============================================================================

export function formatAppointmentStatus(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    in_progress: "En curso",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No presentado",
    rescheduled: "Reprogramada",
  };
  return labels[status];
}

export function getStatusColor(
  status: AppointmentStatus
): "default" | "secondary" | "destructive" | "outline" {
  const colors: Record<
    AppointmentStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    scheduled: "outline",
    confirmed: "default",
    in_progress: "secondary",
    completed: "secondary",
    cancelled: "destructive",
    no_show: "destructive",
    rescheduled: "outline",
  };
  return colors[status];
}

export function getStatusBgColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    rescheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };
  return colors[status];
}

// ============================================================================
// Formateo de contacto
// ============================================================================

export function formatContactDisplay(appointment: AppointmentDetailed): string {
  if (appointment.contact_name) {
    return appointment.contact_name;
  }
  if (appointment.contact_phone) {
    return appointment.contact_phone;
  }
  return "Contacto desconocido";
}

// ============================================================================
// Formateo de ubicacion/agente
// ============================================================================

export function formatAssignment(appointment: AppointmentDetailed): string {
  if (appointment.type === "call") {
    return appointment.agent_email || "Sin asignar";
  }
  return appointment.location_name || "Sin sede";
}

export function formatLocationAddress(appointment: AppointmentDetailed): string {
  if (!appointment.location_address) return "";

  const parts = [appointment.location_address];
  if (appointment.location_city) {
    parts.push(appointment.location_city);
  }
  return parts.join(", ");
}

// ============================================================================
// Titulo para calendario
// ============================================================================

export function getCalendarTitle(appointment: AppointmentDetailed): string {
  const contact = formatContactDisplay(appointment);
  const typeEmoji = appointment.type === "call" ? "📞" : "📍";
  return `${typeEmoji} ${contact}`;
}

// ============================================================================
// Resumen para notificaciones
// ============================================================================

export function getAppointmentSummary(appointment: AppointmentDetailed): string {
  const type = formatAppointmentType(appointment.type);
  const contact = formatContactDisplay(appointment);
  const time = formatAppointmentDate(appointment.scheduled_at);

  return `${type} con ${contact} - ${time}`;
}
