import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  createWhatsAppNumber,
  updateWhatsAppNumber,
  deleteWhatsAppNumber,
} from "../services/whatsapp-number.service";
import type { CreateWhatsAppNumberInput, UpdateWhatsAppNumberInput } from "../services/whatsapp-number.service";

/**
 * Hook for WhatsApp number mutations
 * @param tenantIdOverride - Optional tenant ID for super admin to manage other tenants' numbers
 */
export function useWhatsAppNumberMutations(tenantIdOverride?: string) {
  const queryClient = useQueryClient();
  const { scope } = useAuth();
  const { toast } = useToast();
  const tenantId = tenantIdOverride || scope?.tenantId;

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateWhatsAppNumberInput, "tenant_id">) => {
      if (!tenantId) throw new Error("No tenant ID available");
      return createWhatsAppNumber({ ...input, tenant_id: tenantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers"] });
      toast({
        title: "Número creado",
        description: "El número de WhatsApp ha sido creado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear número",
        description: error.message || "No se pudo crear el número de WhatsApp",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWhatsAppNumberInput }) => {
      if (!scope) throw new Error("No scope available");
      return updateWhatsAppNumber(id, data, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Número actualizado",
        description: "El número de WhatsApp ha sido actualizado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar número",
        description: error.message || "No se pudo actualizar el número",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!scope) throw new Error("No scope available");
      return deleteWhatsAppNumber(id, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Número eliminado",
        description: "El número de WhatsApp ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar número",
        description: error.message || "No se pudo eliminar el número",
        variant: "destructive",
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
