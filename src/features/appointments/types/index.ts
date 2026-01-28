import { Database } from "@/integrations/supabase/types";

// ============================================================================
// Enums desde la DB
// ============================================================================

export type AppointmentType = Database["public"]["Enums"]["appointment_type"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type AppointmentAssignmentTab = "pending_assignment" | "assigned";

// ============================================================================
// Tipos base de la tabla
// ============================================================================

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

// ============================================================================
// Tipo desde la vista detallada
// ============================================================================

export interface AppointmentDetailed {
  id: string;
  tenant_id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  title: string | null;
  description: string | null;
  customer_notes: string | null;
  call_phone_number: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  reminder_sent_at: string | null;
  confirmation_sent_at: string | null;
  created_by: string | null;

  // Contacto
  contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_attributes: Record<string, unknown> | null;

  // Agente (para llamadas)
  agent_id: string | null;
  agent_email: string | null;

  // Sede (para presenciales)
  location_id: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_phone: string | null;

  // Llamada vinculada
  call_id: string | null;
  call_state: Database["public"]["Enums"]["call_state"] | null;
  call_duration: number | null;

  // Calculados
  time_status: "upcoming" | "ongoing" | "past" | "cancelled";
  scheduled_end_at: string;
}

// ============================================================================
// Filtros
// ============================================================================

export interface AppointmentFilters {
  search?: string;
  date_from?: Date | null;
  date_to?: Date | null;
  types?: AppointmentType[];
  statuses?: AppointmentStatus[];
  location_id?: string | null;
  agent_id?: string | null;
  contact_id?: string | null;
  assignment_tab?: AppointmentAssignmentTab;
}

// ============================================================================
// Conteos de tabs
// ============================================================================

export interface AppointmentTabCounts {
  pending_assignment: number;
  assigned: number;
}

// ============================================================================
// Estadisticas
// ============================================================================

export interface AppointmentStats {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  in_progress: number;
  completion_rate: number;
  cancellation_rate: number;
  no_show_rate: number;
  calls_count: number;
  in_person_count: number;
  avg_duration_minutes: number;
}

// ============================================================================
// Sorting y Paginacion
// ============================================================================

export interface AppointmentSortConfig {
  sortBy: keyof AppointmentDetailed;
  sortOrder: "asc" | "desc";
}

export interface AppointmentPaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
}

// ============================================================================
// Inputs para crear/editar
// ============================================================================

export interface CreateAppointmentInput {
  type: AppointmentType;
  contact_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  title?: string;
  description?: string;
  customer_notes?: string;
  // Segun tipo
  agent_id?: string; // Para 'call'
  location_id?: string; // Para 'in_person'
  call_phone_number?: string; // Para 'call'
}

export interface UpdateAppointmentInput {
  scheduled_at?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  title?: string;
  description?: string;
  agent_id?: string;
  location_id?: string;
  call_phone_number?: string;
  cancelled_reason?: string;
  customer_notes?: string;
}

// ============================================================================
// Vista de calendario
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  contact_name: string | null;
  contact_phone: string | null;
  agent_email: string | null;
  location_name: string | null;
  resource?: string; // Para calendar resource view
}

// ============================================================================
// Respuestas de API
// ============================================================================

export interface AppointmentsListResponse {
  data: AppointmentDetailed[];
  count: number;
}

// ============================================================================
// Constantes
// ============================================================================

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  call: "Llamada",
  in_person: "Presencial",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No presentado",
  rescheduled: "Reprogramada",
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
  rescheduled: "bg-purple-100 text-purple-800",
};

export const DEFAULT_DURATION_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1 hora 30 min" },
  { value: 120, label: "2 horas" },
];

export const ASSIGNMENT_TAB_LABELS: Record<AppointmentAssignmentTab, string> = {
  pending_assignment: "Pendientes de asignar",
  assigned: "Asignadas",
};
