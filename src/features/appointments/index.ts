// ============================================================================
// Feature: Appointments
// Sistema de gestion de citas (llamadas y presenciales)
// ============================================================================

// Types
export * from "./types";

// Repository
export { appointmentsRepo } from "./lib/repos/appointments.repo";

// Hooks - Data
export {
  useAppointmentsData,
  useAppointmentDetail,
  useAppointmentsCalendar,
  useContactAppointments,
  useTodayAppointments,
  useUpcomingAppointments,
  appointmentsQueryKeys,
  APPOINTMENTS_QUERY_KEY,
  APPOINTMENTS_STATS_QUERY_KEY,
} from "./hooks/use-appointments-data";

// Hooks - Mutations
export { useAppointmentMutations } from "./hooks/use-appointment-mutations";

// Hooks - State
export { useAppointmentsFilters } from "./hooks/use-appointments-filters";
export { useAppointmentsPagination } from "./hooks/use-appointments-pagination";
export { useAppointmentsSorting, SORTABLE_COLUMNS } from "./hooks/use-appointments-sorting";
export {
  useAppointmentsUrlState,
  type AppointmentView,
  type AppointmentDetailTab,
} from "./hooks/use-appointments-url-state";
export {
  useAppointmentsPreferences,
  type TableDensity,
  type CalendarViewMode,
  type AppointmentsPreferences,
} from "./hooks/use-appointments-preferences";
export {
  useAppointmentsCalendarState,
  type CalendarView,
  type CalendarRange,
} from "./hooks/use-appointments-calendar";

// Hooks - Agents
export {
  useTenantAgents,
  useAgentById,
  useAgentOptions,
  TENANT_AGENTS_QUERY_KEY,
  type TenantAgent,
} from "./hooks/use-tenant-agents";

// Hooks - Prefetching
export { usePrefetchAppointments } from "./hooks/use-prefetch-appointments";

// Hooks - Realtime
export { useRealtimeAppointments } from "./hooks/use-realtime-appointments";

// Hooks - Orchestrator (combina todos los hooks para la pagina)
export { useAppointmentsPage } from "./hooks/use-appointments-page";

// Utils
export * from "./utils/appointment-formatters";

// Components
export { AppointmentsPage } from "./components/AppointmentsPage";
export { AppointmentsHeader } from "./components/AppointmentsHeader";
export { AppointmentsFilters } from "./components/AppointmentsFilters";
export { AppointmentsTable } from "./components/AppointmentsTable";
export { AppointmentsPagination } from "./components/AppointmentsPagination";
export { AppointmentsEmpty } from "./components/AppointmentsEmpty";
export { AppointmentsError } from "./components/AppointmentsError";
export { AppointmentStatsCards, AppointmentStatsInline } from "./components/AppointmentStatsCards";
export { AppointmentTypeBadge } from "./components/AppointmentTypeBadge";
export { AppointmentStatusBadge } from "./components/AppointmentStatusBadge";
export { AppointmentFormDialog } from "./components/AppointmentFormDialog";
export { AppointmentDetailModal } from "./components/AppointmentDetailModal";
export { getAppointmentColumns, appointmentColumns } from "./components/appointment-columns";

// Calendar Components
export {
  AppointmentsCalendar,
  CalendarHeader,
  CalendarMonthView,
  CalendarWeekView,
  CalendarDayView,
  CalendarAgendaView,
  CalendarEventCard,
  CalendarEventDot,
} from "./components/calendar";

// Widgets (para integración con otros módulos)
export {
  ContactUpcomingAppointments,
  AppointmentMiniCard,
  QuickAppointmentButton,
  AppointmentIndicator,
} from "./components/widgets";
