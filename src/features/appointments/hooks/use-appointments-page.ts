import { useMemo, useCallback, useEffect } from "react";
import { useAppointmentsData, useAppointmentDetail, useAppointmentTabCounts } from "./use-appointments-data";
import { useAppointmentMutations } from "./use-appointment-mutations";
import { useAppointmentsFilters } from "./use-appointments-filters";
import { useAppointmentsPagination } from "./use-appointments-pagination";
import { useAppointmentsSorting } from "./use-appointments-sorting";
import { useAppointmentsUrlState } from "./use-appointments-url-state";
import { useAppointmentsPreferences } from "./use-appointments-preferences";
import { useRealtimeAppointments } from "./use-realtime-appointments";
import { usePrefetchAppointments } from "./use-prefetch-appointments";
import type { AppointmentDetailed, AppointmentFilters } from "../types";

// ============================================================================
// Hook: useAppointmentsPage
// Hook orquestador que combina todos los hooks necesarios para la pagina
// ============================================================================

interface UseAppointmentsPageOptions {
  /** Habilitar realtime */
  enableRealtime?: boolean;
  /** Habilitar prefetching */
  enablePrefetching?: boolean;
}

export function useAppointmentsPage({
  enableRealtime = true,
  enablePrefetching = true,
}: UseAppointmentsPageOptions = {}) {
  // ============================================================================
  // URL State
  // ============================================================================

  const urlState = useAppointmentsUrlState();
  const {
    selectedAppointmentId,
    view,
    isCreateOpen,
    urlPage,
    assignmentTab,
    setSelectedAppointmentId,
    setView,
    setAssignmentTab,
    openAppointmentDetail,
    closeAppointmentDetail,
    openCreateDialog,
    closeCreateDialog,
    setUrlPage,
  } = urlState;

  // ============================================================================
  // Preferences
  // ============================================================================

  const { preferences, setTableDensity, setCalendarViewMode } =
    useAppointmentsPreferences();

  // ============================================================================
  // Filters
  // ============================================================================

  const filtersState = useAppointmentsFilters();
  const {
    filters,
    deferredFilters,
    hasActiveFilters,
    activeFilterCount,
    isSearchPending,
    setSearch,
    setDateRange,
    setTypes,
    setStatuses,
    setLocationId,
    setAgentId,
    resetFilters,
    setFilters,
  } = filtersState;

  // Sincronizar assignment_tab con filtros
  useEffect(() => {
    setFilters((prev) => ({ ...prev, assignment_tab: assignmentTab }));
  }, [assignmentTab, setFilters]);

  // Calcular filtros base para conteos de tabs (sin assignment_tab)
  const baseFiltersForCounts = useMemo(() => {
    const { assignment_tab, ...rest } = deferredFilters;
    return rest as Omit<AppointmentFilters, "assignment_tab">;
  }, [deferredFilters]);

  // Fetch conteos de tabs
  const { data: tabCounts, isLoading: tabCountsLoading } = useAppointmentTabCounts(
    baseFiltersForCounts,
    view === "table"
  );

  // ============================================================================
  // Pagination
  // ============================================================================

  const paginationState = useAppointmentsPagination({
    initialPage: urlPage,
  });
  const { page, pageSize, setPage, setPageSize, getPaginationInfo, goToFirst } =
    paginationState;

  // Sincronizar pagina con URL
  useEffect(() => {
    if (page !== urlPage) {
      setUrlPage(page);
    }
  }, [page, urlPage, setUrlPage]);

  // Reset pagina cuando cambian los filtros
  useEffect(() => {
    goToFirst();
  }, [deferredFilters, goToFirst]);

  // ============================================================================
  // Sorting
  // ============================================================================

  const sortingState = useAppointmentsSorting();
  const { sort, toggleSort, isSortedBy, getSortDirection } = sortingState;

  // ============================================================================
  // Data
  // ============================================================================

  const {
    appointments,
    totalCount,
    isLoading,
    isError,
    error,
    stats,
    statsLoading,
    refetch,
  } = useAppointmentsData({
    filters: deferredFilters,
    page,
    pageSize,
    sort,
    enabled: view === "table", // Solo cargar si es vista de tabla
  });

  // Calcular info de paginacion
  const paginationInfo = useMemo(
    () => getPaginationInfo(totalCount),
    [getPaginationInfo, totalCount]
  );

  // ============================================================================
  // Selected Appointment Detail
  // ============================================================================

  const { data: selectedAppointment, isLoading: isLoadingDetail } =
    useAppointmentDetail(selectedAppointmentId);

  // ============================================================================
  // Mutations
  // ============================================================================

  const mutations = useAppointmentMutations();
  const {
    createMutation,
    updateMutation,
    cancelMutation,
    rescheduleMutation,
    confirmMutation,
    completeMutation,
    noShowMutation,
    deleteMutation,
    isLoading: isMutating,
  } = mutations;

  // ============================================================================
  // Realtime
  // ============================================================================

  const { isConnected } = useRealtimeAppointments({
    enabled: enableRealtime,
  });

  // ============================================================================
  // Prefetching
  // ============================================================================

  const { prefetchNextPage, prefetchAppointment } = usePrefetchAppointments({
    filters: deferredFilters,
    currentPage: page,
    pageSize,
    sort,
    totalPages: paginationInfo.totalPages,
  });

  // Prefetch siguiente pagina cuando hay mas paginas
  useEffect(() => {
    if (enablePrefetching && paginationInfo.canGoNext) {
      prefetchNextPage();
    }
  }, [enablePrefetching, paginationInfo.canGoNext, prefetchNextPage]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRowClick = useCallback(
    (appointment: AppointmentDetailed) => {
      openAppointmentDetail(appointment.id);
    },
    [openAppointmentDetail]
  );

  const handleRowHover = useCallback(
    (appointmentId: string) => {
      if (enablePrefetching) {
        prefetchAppointment(appointmentId);
      }
    },
    [enablePrefetching, prefetchAppointment]
  );

  const handleCreate = useCallback(
    async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
      await createMutation.mutateAsync(data);
      closeCreateDialog();
    },
    [createMutation, closeCreateDialog]
  );

  const handleCancel = useCallback(
    async (id: string, reason?: string) => {
      await cancelMutation.mutateAsync({ id, reason });
      closeAppointmentDetail();
    },
    [cancelMutation, closeAppointmentDetail]
  );

  const handleReschedule = useCallback(
    async (id: string, newDateTime: string, reason?: string) => {
      const newAppointment = await rescheduleMutation.mutateAsync({
        id,
        newDateTime,
        reason,
      });
      // Navegar a la nueva cita
      openAppointmentDetail(newAppointment.id);
    },
    [rescheduleMutation, openAppointmentDetail]
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      await confirmMutation.mutateAsync(id);
    },
    [confirmMutation]
  );

  const handleComplete = useCallback(
    async (id: string) => {
      await completeMutation.mutateAsync(id);
    },
    [completeMutation]
  );

  const handleNoShow = useCallback(
    async (id: string) => {
      await noShowMutation.mutateAsync(id);
    },
    [noShowMutation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
      closeAppointmentDetail();
    },
    [deleteMutation, closeAppointmentDetail]
  );

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Vista
    view,
    setView,
    isTableView: view === "table",
    isCalendarView: view === "calendar",

    // Tabs de asignación
    assignmentTab,
    setAssignmentTab,
    tabCounts,
    tabCountsLoading,

    // Datos
    appointments,
    totalCount,
    isLoading,
    isError,
    error,
    stats,
    statsLoading,
    refetch,

    // Appointment seleccionado
    selectedAppointmentId,
    selectedAppointment,
    isLoadingDetail,
    isDetailOpen: !!selectedAppointmentId,

    // Dialogo de creacion
    isCreateOpen,
    openCreateDialog,
    closeCreateDialog,

    // Filtros
    filters,
    hasActiveFilters,
    activeFilterCount,
    isSearchPending,
    setSearch,
    setDateRange,
    setTypes,
    setStatuses,
    setLocationId,
    setAgentId,
    resetFilters,

    // Paginacion
    page,
    pageSize,
    setPage,
    setPageSize,
    paginationInfo,

    // Sorting
    sort,
    toggleSort,
    isSortedBy,
    getSortDirection,

    // Preferencias
    preferences,
    setTableDensity,
    setCalendarViewMode,

    // Realtime
    isConnected,

    // Mutations
    isMutating,

    // Handlers
    handleRowClick,
    handleRowHover,
    handleCreate,
    handleCancel,
    handleReschedule,
    handleConfirm,
    handleComplete,
    handleNoShow,
    handleDelete,

    // Navegacion de detalle
    openAppointmentDetail,
    closeAppointmentDetail,

    // Acceso a hooks individuales (por si se necesita)
    urlState,
    filtersState,
    paginationState,
    sortingState,
    mutations,
  };
}
