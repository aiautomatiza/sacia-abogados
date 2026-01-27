/**
 * @fileoverview Appointments Page
 * @description Pagina principal del modulo de citas. Orquesta todos los componentes.
 */

import { useState } from "react";
import { useAppointmentsPage } from "../hooks/use-appointments-page";
import { AppointmentsHeader } from "./AppointmentsHeader";
import { AppointmentsFilters } from "./AppointmentsFilters";
import { AppointmentStatsCards } from "./AppointmentStatsCards";
import { AppointmentsTable } from "./AppointmentsTable";
import { AppointmentsPagination } from "./AppointmentsPagination";
import { AppointmentsEmpty } from "./AppointmentsEmpty";
import { AppointmentsError } from "./AppointmentsError";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { AppointmentFormDialog } from "./AppointmentFormDialog";
import { AppointmentsCalendar } from "./calendar";
import type { AppointmentDetailed, AppointmentStatus, CalendarEvent } from "../types";

export function AppointmentsPage() {
  const {
    // Vista
    view,
    setView,
    isTableView,

    // Datos
    appointments,
    isLoading,
    isError,
    error,
    stats,
    statsLoading,
    refetch,

    // Appointment seleccionado
    selectedAppointment,
    isDetailOpen,

    // Dialogo de creacion
    isCreateOpen,
    openCreateDialog,
    closeCreateDialog,

    // Filtros
    filters,
    hasActiveFilters,
    isSearchPending,
    setSearch,
    setDateRange,
    setTypes,
    setStatuses,
    setLocationId,
    setAgentId,
    resetFilters,

    // Paginacion
    setPage,
    setPageSize,
    paginationInfo,

    // Sorting
    toggleSort,

    // Preferencias
    preferences,

    // Realtime
    isConnected,

    // Mutations
    mutations,

    // Handlers
    handleRowClick,
    handleRowHover,
    openAppointmentDetail,
    closeAppointmentDetail,
  } = useAppointmentsPage();

  // Estado local para edición
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentDetailed | null>(null);

  // Handlers de acciones
  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await mutations.updateStatusMutation.mutateAsync({ id, status });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCancel = (id: string) => {
    // Abrimos el modal de detalle que tiene el diálogo de cancelación
    openAppointmentDetail(id);
  };

  const handleReschedule = (id: string) => {
    // Abrimos para editar
    const appointment = appointments.find((a) => a.id === id);
    if (appointment) {
      setEditingAppointment(appointment);
    }
  };

  const handleEdit = (appointment: AppointmentDetailed) => {
    closeAppointmentDetail();
    setEditingAppointment(appointment);
  };

  const handleCloseEditDialog = () => {
    setEditingAppointment(null);
  };

  const handleCreateClick = () => {
    openCreateDialog();
  };

  // Handler para clicks en eventos del calendario
  const handleCalendarEventClick = (event: CalendarEvent) => {
    openAppointmentDetail(event.id);
  };

  // Handler para clicks en slots del calendario (crear cita)
  const handleCalendarSlotClick = (date: Date) => {
    // Abrir dialogo de creación con la fecha preseleccionada
    // Por ahora solo abrimos el dialogo
    openCreateDialog();
  };

  const isEmpty = !isLoading && appointments.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <AppointmentsHeader
            view={view}
            onViewChange={setView}
            onCreateClick={handleCreateClick}
            onRefresh={() => refetch()}
            isConnected={isConnected}
            isRefreshing={isLoading}
          />

          {/* Stats Cards */}
          <AppointmentStatsCards stats={stats} isLoading={statsLoading} />

          {/* Filtros */}
          <AppointmentsFilters
            filters={filters}
            onSearchChange={setSearch}
            onDateFromChange={(date) =>
              setDateRange(date, filters.date_to || null)
            }
            onDateToChange={(date) =>
              setDateRange(filters.date_from || null, date)
            }
            onTypesChange={setTypes}
            onStatusesChange={setStatuses}
            onLocationChange={setLocationId}
            onAgentChange={setAgentId}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
            isSearchPending={isSearchPending}
          />

          {/* Contenido principal */}
          {isError ? (
            <AppointmentsError error={error} onRetry={() => refetch()} />
          ) : isEmpty ? (
            <AppointmentsEmpty
              hasFilters={hasActiveFilters}
              onCreateClick={handleCreateClick}
              onClearFilters={resetFilters}
            />
          ) : isTableView ? (
            <>
              <AppointmentsTable
                appointments={appointments}
                isLoading={isLoading}
                onRowClick={handleRowClick}
                onSort={toggleSort}
                onRowHover={handleRowHover}
                onStatusChange={handleStatusChange}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
                density={preferences.tableDensity}
              />

              <AppointmentsPagination
                pagination={paginationInfo}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                isLoading={isLoading}
              />
            </>
          ) : (
            // Vista de calendario
            <AppointmentsCalendar
              onEventClick={handleCalendarEventClick}
              onSlotClick={handleCalendarSlotClick}
              filters={{
                types: filters.types,
                statuses: filters.statuses,
                location_id: filters.location_id,
                agent_id: filters.agent_id,
              }}
            />
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      <AppointmentDetailModal
        appointment={selectedAppointment || null}
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeAppointmentDetail();
        }}
        onEdit={handleEdit}
      />

      {/* Dialogo de creación */}
      <AppointmentFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}
      />

      {/* Dialogo de edición */}
      <AppointmentFormDialog
        open={!!editingAppointment}
        onOpenChange={(open) => {
          if (!open) handleCloseEditDialog();
        }}
        appointment={editingAppointment}
      />
    </div>
  );
}
