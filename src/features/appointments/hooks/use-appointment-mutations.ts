import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { appointmentsRepo } from "../lib/repos/appointments.repo";
import {
  APPOINTMENTS_QUERY_KEY,
  APPOINTMENTS_STATS_QUERY_KEY,
} from "./use-appointments-data";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentStatus,
  APPOINTMENT_STATUS_LABELS,
} from "../types";

// ============================================================================
// Status labels para mensajes
// ============================================================================

const STATUS_MESSAGES: Record<AppointmentStatus, string> = {
  scheduled: "Cita programada",
  confirmed: "Cita confirmada",
  in_progress: "Cita en progreso",
  completed: "Cita completada",
  cancelled: "Cita cancelada",
  no_show: "Marcado como no presentado",
  rescheduled: "Cita reprogramada",
};

// ============================================================================
// Hook: useAppointmentMutations
// ============================================================================

export function useAppointmentMutations() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  const invalidateQueries = () => {
    if (tenantId) {
      queryClient.invalidateQueries({
        queryKey: [APPOINTMENTS_QUERY_KEY, tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: [APPOINTMENTS_STATS_QUERY_KEY, tenantId],
      });
    }
  };

  // Crear appointment
  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      appointmentsRepo.createAppointment(data),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la cita");
    },
  });

  // Actualizar appointment
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentInput }) =>
      appointmentsRepo.updateAppointment(id, data),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la cita");
    },
  });

  // Cambiar estado
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsRepo.updateAppointmentStatus(id, status),
    onSuccess: (_, variables) => {
      invalidateQueries();
      toast.success(STATUS_MESSAGES[variables.status]);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cambiar el estado");
    },
  });

  // Cancelar appointment
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      appointmentsRepo.cancelAppointment(id, reason),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita cancelada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cancelar la cita");
    },
  });

  // Reprogramar appointment
  const rescheduleMutation = useMutation({
    mutationFn: ({
      id,
      newDateTime,
      reason,
    }: {
      id: string;
      newDateTime: string;
      reason?: string;
    }) => appointmentsRepo.rescheduleAppointment(id, newDateTime, reason),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita reprogramada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al reprogramar la cita");
    },
  });

  // Eliminar appointment
  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsRepo.deleteAppointment(id),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la cita");
    },
  });

  // Vincular llamada con appointment
  const linkCallMutation = useMutation({
    mutationFn: ({
      appointmentId,
      callId,
    }: {
      appointmentId: string;
      callId: string;
    }) => appointmentsRepo.linkCallToAppointment(appointmentId, callId),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Llamada vinculada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al vincular la llamada");
    },
  });

  // Marcar como confirmada
  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      appointmentsRepo.updateAppointmentStatus(id, "confirmed"),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita confirmada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al confirmar la cita");
    },
  });

  // Marcar como completada
  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      appointmentsRepo.updateAppointmentStatus(id, "completed"),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Cita completada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al completar la cita");
    },
  });

  // Marcar como no-show
  const noShowMutation = useMutation({
    mutationFn: (id: string) =>
      appointmentsRepo.updateAppointmentStatus(id, "no_show"),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Marcado como no presentado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al marcar como no presentado");
    },
  });

  return {
    // Mutations principales
    createMutation,
    updateMutation,
    updateStatusMutation,
    cancelMutation,
    rescheduleMutation,
    deleteMutation,
    linkCallMutation,

    // Shortcuts de estado
    confirmMutation,
    completeMutation,
    noShowMutation,

    // Estado de carga global
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      updateStatusMutation.isPending ||
      cancelMutation.isPending ||
      rescheduleMutation.isPending ||
      deleteMutation.isPending ||
      linkCallMutation.isPending ||
      confirmMutation.isPending ||
      completeMutation.isPending ||
      noShowMutation.isPending,
  };
}
