import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsRepo } from "../lib/repos/appointments.repo";
import type {
  AppointmentFilters,
  AppointmentSortConfig,
  AppointmentDetailed,
  AppointmentTabCounts,
} from "../types";

// ============================================================================
// Query Keys
// ============================================================================

export const APPOINTMENTS_QUERY_KEY = "appointments";
export const APPOINTMENTS_STATS_QUERY_KEY = "appointments-stats";

export const appointmentsQueryKeys = {
  all: (tenantId: string) => [APPOINTMENTS_QUERY_KEY, tenantId] as const,
  list: (
    tenantId: string,
    filters: AppointmentFilters,
    page: number,
    pageSize: number,
    sort: AppointmentSortConfig
  ) => [APPOINTMENTS_QUERY_KEY, tenantId, filters, page, pageSize, sort] as const,
  detail: (tenantId: string, id: string) =>
    [APPOINTMENTS_QUERY_KEY, "detail", tenantId, id] as const,
  stats: (tenantId: string, filters: AppointmentFilters) =>
    [APPOINTMENTS_STATS_QUERY_KEY, tenantId, filters] as const,
  tabCounts: (tenantId: string, baseFilters: Omit<AppointmentFilters, "assignment_tab">) =>
    [APPOINTMENTS_QUERY_KEY, "tab-counts", tenantId, baseFilters] as const,
  calendar: (tenantId: string, start: string, end: string) =>
    [APPOINTMENTS_QUERY_KEY, "calendar", tenantId, start, end] as const,
  contactUpcoming: (tenantId: string, contactId: string) =>
    [APPOINTMENTS_QUERY_KEY, "contact", tenantId, contactId] as const,
  today: (tenantId: string) =>
    [APPOINTMENTS_QUERY_KEY, "today", tenantId] as const,
};

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;

// ============================================================================
// Hook: useAppointmentsData - Datos paginados + estadisticas (split queries)
// ============================================================================

interface UseAppointmentsDataOptions {
  filters: AppointmentFilters;
  page: number;
  pageSize?: number;
  sort: AppointmentSortConfig;
  enabled?: boolean;
}

export function useAppointmentsData({
  filters,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  sort,
  enabled = true,
}: UseAppointmentsDataOptions) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;
  const { scope } = useAuth();
  const queryClient = useQueryClient();

  // Query 1: Datos paginados
  const appointmentsQuery = useQuery({
    queryKey: appointmentsQueryKeys.list(tenantId ?? "", filters, page, pageSize, sort),
    queryFn: () => appointmentsRepo.listAppointments(filters, page, pageSize, sort, scope ?? undefined),
    enabled: enabled && !!tenantId,
    staleTime: 30000, // 30 segundos
    placeholderData: (previousData) => previousData,
  });

  // Query 2: Estadisticas (independiente, cache mas largo)
  const statsQuery = useQuery({
    queryKey: appointmentsQueryKeys.stats(tenantId ?? "", filters),
    queryFn: () => appointmentsRepo.getAppointmentStats(filters, scope ?? undefined),
    enabled: enabled && !!tenantId,
    staleTime: 60000, // 1 minuto
  });

  const refetch = () => {
    queryClient.invalidateQueries({
      queryKey: [APPOINTMENTS_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [APPOINTMENTS_STATS_QUERY_KEY],
    });
  };

  return {
    appointments: appointmentsQuery.data?.data || [],
    totalCount: appointmentsQuery.data?.count || 0,
    isLoading: appointmentsQuery.isLoading,
    isError: appointmentsQuery.isError,
    error: appointmentsQuery.error,
    stats: statsQuery.data || null,
    statsLoading: statsQuery.isLoading,
    refetch,
  };
}

// ============================================================================
// Hook: useAppointmentDetail - Detalle de una cita
// ============================================================================

export function useAppointmentDetail(appointmentId: string | null) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: appointmentsQueryKeys.detail(tenantId ?? "", appointmentId ?? ""),
    queryFn: () => appointmentsRepo.getAppointmentById(appointmentId!),
    enabled: !!tenantId && !!appointmentId,
    staleTime: 30000,
  });
}

// ============================================================================
// Hook: useAppointmentsCalendar - Citas para vista de calendario
// ============================================================================

interface UseAppointmentsCalendarOptions {
  startDate: Date;
  endDate: Date;
  filters?: Partial<AppointmentFilters>;
  enabled?: boolean;
}

export function useAppointmentsCalendar({
  startDate,
  endDate,
  filters = {},
  enabled = true,
}: UseAppointmentsCalendarOptions) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: appointmentsQueryKeys.calendar(
      tenantId ?? "",
      startDate.toISOString(),
      endDate.toISOString()
    ),
    queryFn: () => appointmentsRepo.getAppointmentsForCalendar(startDate, endDate, filters),
    enabled: enabled && !!tenantId,
    staleTime: 30000,
  });
}

// ============================================================================
// Hook: useContactAppointments - Proximas citas de un contacto
// ============================================================================

export function useContactAppointments(contactId: string | null, limit: number = 5) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: appointmentsQueryKeys.contactUpcoming(tenantId ?? "", contactId ?? ""),
    queryFn: () => appointmentsRepo.getContactUpcomingAppointments(contactId!, limit),
    enabled: !!tenantId && !!contactId,
    staleTime: 30000,
  });
}

// ============================================================================
// Hook: useTodayAppointments - Citas de hoy
// ============================================================================

export function useTodayAppointments() {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: appointmentsQueryKeys.today(tenantId ?? ""),
    queryFn: () => appointmentsRepo.getTodayAppointments(),
    enabled: !!tenantId,
    staleTime: 60000, // 1 minuto
  });
}

// ============================================================================
// Hook: useUpcomingAppointments - Proximas citas (7 dias)
// ============================================================================

export function useUpcomingAppointments(days: number = 7) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: [APPOINTMENTS_QUERY_KEY, "upcoming", tenantId, days],
    queryFn: () => appointmentsRepo.getUpcomingAppointments(days),
    enabled: !!tenantId,
    staleTime: 60000, // 1 minuto
  });
}

// ============================================================================
// Hook: useAppointmentTabCounts - Conteos para tabs de asignación
// ============================================================================

export function useAppointmentTabCounts(
  baseFilters: Omit<AppointmentFilters, "assignment_tab"> = {},
  enabled = true
) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;
  const { scope } = useAuth();

  return useQuery({
    queryKey: appointmentsQueryKeys.tabCounts(tenantId ?? "", baseFilters),
    queryFn: () => appointmentsRepo.getAppointmentTabCounts(baseFilters, scope ?? undefined),
    enabled: enabled && !!tenantId,
    staleTime: 30000, // 30 segundos
  });
}
