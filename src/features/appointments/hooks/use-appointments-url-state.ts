import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// ============================================================================
// Tipos
// ============================================================================

export type AppointmentView = "table" | "calendar";
export type AppointmentDetailTab = "details" | "history" | "notes";

// ============================================================================
// Hook: useAppointmentsUrlState
// Gestiona el estado de la URL para deep linking y navegacion
// ============================================================================

export function useAppointmentsUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ============================================================================
  // Lectores
  // ============================================================================

  // ID del appointment seleccionado
  const selectedAppointmentId = searchParams.get("appointmentId");

  // Vista activa (tabla o calendario)
  const view = (searchParams.get("view") as AppointmentView) || "table";

  // Tab activo en el modal de detalle
  const activeTab = (searchParams.get("tab") as AppointmentDetailTab) || "details";

  // Pagina actual (para sincronizar con paginacion)
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  // Fecha del calendario (para navegacion de calendario)
  const calendarDate = searchParams.get("date");

  // Modal de creacion abierto
  const isCreateOpen = searchParams.get("create") === "true";

  // ============================================================================
  // Setters
  // ============================================================================

  const setSelectedAppointmentId = useCallback(
    (appointmentId: string | null) => {
      setSearchParams((prev) => {
        if (appointmentId) {
          prev.set("appointmentId", appointmentId);
        } else {
          prev.delete("appointmentId");
          prev.delete("tab"); // Limpiar tab cuando se cierra
        }
        return prev;
      });
    },
    [setSearchParams]
  );

  const setView = useCallback(
    (newView: AppointmentView) => {
      setSearchParams((prev) => {
        prev.set("view", newView);
        // Resetear pagina cuando cambia la vista
        prev.delete("page");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setActiveTab = useCallback(
    (tab: AppointmentDetailTab) => {
      setSearchParams((prev) => {
        prev.set("tab", tab);
        return prev;
      });
    },
    [setSearchParams]
  );

  const setUrlPage = useCallback(
    (page: number) => {
      setSearchParams((prev) => {
        if (page > 1) {
          prev.set("page", page.toString());
        } else {
          prev.delete("page");
        }
        return prev;
      });
    },
    [setSearchParams]
  );

  const setCalendarDate = useCallback(
    (date: Date | null) => {
      setSearchParams((prev) => {
        if (date) {
          prev.set("date", date.toISOString().split("T")[0]);
        } else {
          prev.delete("date");
        }
        return prev;
      });
    },
    [setSearchParams]
  );

  const setCreateOpen = useCallback(
    (open: boolean) => {
      setSearchParams((prev) => {
        if (open) {
          prev.set("create", "true");
        } else {
          prev.delete("create");
        }
        return prev;
      });
    },
    [setSearchParams]
  );

  // ============================================================================
  // Acciones compuestas
  // ============================================================================

  const openAppointmentDetail = useCallback(
    (appointmentId: string, tab: AppointmentDetailTab = "details") => {
      setSearchParams((prev) => {
        prev.set("appointmentId", appointmentId);
        prev.set("tab", tab);
        return prev;
      });
    },
    [setSearchParams]
  );

  const closeAppointmentDetail = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete("appointmentId");
      prev.delete("tab");
      return prev;
    });
  }, [setSearchParams]);

  const openCreateDialog = useCallback(() => {
    setSearchParams((prev) => {
      prev.set("create", "true");
      return prev;
    });
  }, [setSearchParams]);

  const closeCreateDialog = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete("create");
      return prev;
    });
  }, [setSearchParams]);

  const resetUrlState = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Estado
    selectedAppointmentId,
    view,
    activeTab,
    urlPage,
    calendarDate: calendarDate ? new Date(calendarDate) : null,
    isCreateOpen,

    // Setters individuales
    setSelectedAppointmentId,
    setView,
    setActiveTab,
    setUrlPage,
    setCalendarDate,
    setCreateOpen,

    // Acciones compuestas
    openAppointmentDetail,
    closeAppointmentDetail,
    openCreateDialog,
    closeCreateDialog,
    resetUrlState,

    // Helpers
    isDetailOpen: !!selectedAppointmentId,
    isTableView: view === "table",
    isCalendarView: view === "calendar",
  };
}
