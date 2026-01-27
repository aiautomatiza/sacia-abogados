import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { locationsRepo } from "../lib/repos/locations.repo";
import { LOCATIONS_QUERY_KEY } from "./use-locations";
import type { CreateLocationInput, UpdateLocationInput } from "../types";

// ============================================================================
// Hook: useLocationMutations
// ============================================================================

export function useLocationMutations() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  const invalidateQueries = () => {
    if (tenantId) {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY, tenantId] });
    }
  };

  // Crear location
  const createMutation = useMutation({
    mutationFn: (data: CreateLocationInput) => locationsRepo.createLocation(data),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Sede creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la sede");
    },
  });

  // Actualizar location
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationInput }) =>
      locationsRepo.updateLocation(id, data),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Sede actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la sede");
    },
  });

  // Eliminar location
  const deleteMutation = useMutation({
    mutationFn: (id: string) => locationsRepo.deleteLocation(id),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Sede eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la sede");
    },
  });

  // Establecer como default
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => locationsRepo.setDefaultLocation(id),
    onSuccess: () => {
      invalidateQueries();
      toast.success("Sede establecida como principal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al establecer sede principal");
    },
  });

  // Activar/Desactivar
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      locationsRepo.toggleLocationActive(id, isActive),
    onSuccess: (_, variables) => {
      invalidateQueries();
      toast.success(
        variables.isActive ? "Sede activada" : "Sede desactivada"
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cambiar estado de la sede");
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    setDefaultMutation,
    toggleActiveMutation,
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      setDefaultMutation.isPending ||
      toggleActiveMutation.isPending,
  };
}
