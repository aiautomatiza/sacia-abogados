import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { appointmentsRepo } from "../lib/repos/appointments.repo";
import { appointmentsQueryKeys } from "./use-appointments-data";
import type { AppointmentFilters, AppointmentSortConfig } from "../types";

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;

// ============================================================================
// Hook: usePrefetchAppointments
// Estrategia de prefetching para mejorar UX
// ============================================================================

interface UsePrefetchAppointmentsOptions {
  filters: AppointmentFilters;
  currentPage: number;
  pageSize?: number;
  sort: AppointmentSortConfig;
  totalPages: number;
}

export function usePrefetchAppointments({
  filters,
  currentPage,
  pageSize = DEFAULT_PAGE_SIZE,
  sort,
  totalPages,
}: UsePrefetchAppointmentsOptions) {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  // ============================================================================
  // Prefetch pagina siguiente
  // ============================================================================

  const prefetchNextPage = useCallback(() => {
    if (!tenantId || currentPage >= totalPages) return;

    const nextPage = currentPage + 1;

    queryClient.prefetchQuery({
      queryKey: appointmentsQueryKeys.list(
        tenantId,
        filters,
        nextPage,
        pageSize,
        sort
      ),
      queryFn: () =>
        appointmentsRepo.listAppointments(filters, nextPage, pageSize, sort),
      staleTime: 30000,
    });
  }, [tenantId, currentPage, totalPages, filters, pageSize, sort, queryClient]);

  // ============================================================================
  // Prefetch pagina anterior
  // ============================================================================

  const prefetchPreviousPage = useCallback(() => {
    if (!tenantId || currentPage <= 1) return;

    const prevPage = currentPage - 1;

    queryClient.prefetchQuery({
      queryKey: appointmentsQueryKeys.list(
        tenantId,
        filters,
        prevPage,
        pageSize,
        sort
      ),
      queryFn: () =>
        appointmentsRepo.listAppointments(filters, prevPage, pageSize, sort),
      staleTime: 30000,
    });
  }, [tenantId, currentPage, filters, pageSize, sort, queryClient]);

  // ============================================================================
  // Prefetch detalle de appointment (on hover)
  // ============================================================================

  const prefetchAppointment = useCallback(
    (appointmentId: string) => {
      if (!tenantId) return;

      queryClient.prefetchQuery({
        queryKey: appointmentsQueryKeys.detail(tenantId, appointmentId),
        queryFn: () => appointmentsRepo.getAppointmentById(appointmentId),
        staleTime: 30000,
      });
    },
    [tenantId, queryClient]
  );

  // ============================================================================
  // Prefetch citas de un contacto
  // ============================================================================

  const prefetchContactAppointments = useCallback(
    (contactId: string) => {
      if (!tenantId) return;

      queryClient.prefetchQuery({
        queryKey: appointmentsQueryKeys.contactUpcoming(tenantId, contactId),
        queryFn: () =>
          appointmentsRepo.getContactUpcomingAppointments(contactId, 5),
        staleTime: 30000,
      });
    },
    [tenantId, queryClient]
  );

  // ============================================================================
  // Prefetch datos de calendario para un rango de fechas
  // ============================================================================

  const prefetchCalendarRange = useCallback(
    (startDate: Date, endDate: Date) => {
      if (!tenantId) return;

      queryClient.prefetchQuery({
        queryKey: appointmentsQueryKeys.calendar(
          tenantId,
          startDate.toISOString(),
          endDate.toISOString()
        ),
        queryFn: () =>
          appointmentsRepo.getAppointmentsForCalendar(startDate, endDate),
        staleTime: 30000,
      });
    },
    [tenantId, queryClient]
  );

  // ============================================================================
  // Prefetch semana siguiente en calendario
  // ============================================================================

  const prefetchNextWeek = useCallback(
    (currentDate: Date) => {
      if (!tenantId) return;

      const nextWeekStart = new Date(currentDate);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      nextWeekStart.setHours(0, 0, 0, 0);

      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      nextWeekEnd.setHours(23, 59, 59, 999);

      prefetchCalendarRange(nextWeekStart, nextWeekEnd);
    },
    [tenantId, prefetchCalendarRange]
  );

  // ============================================================================
  // Prefetch semana anterior en calendario
  // ============================================================================

  const prefetchPreviousWeek = useCallback(
    (currentDate: Date) => {
      if (!tenantId) return;

      const prevWeekEnd = new Date(currentDate);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      prevWeekEnd.setHours(23, 59, 59, 999);

      const prevWeekStart = new Date(prevWeekEnd);
      prevWeekStart.setDate(prevWeekStart.getDate() - 6);
      prevWeekStart.setHours(0, 0, 0, 0);

      prefetchCalendarRange(prevWeekStart, prevWeekEnd);
    },
    [tenantId, prefetchCalendarRange]
  );

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Paginacion
    prefetchNextPage,
    prefetchPreviousPage,

    // Detalle
    prefetchAppointment,
    prefetchContactAppointments,

    // Calendario
    prefetchCalendarRange,
    prefetchNextWeek,
    prefetchPreviousWeek,
  };
}
