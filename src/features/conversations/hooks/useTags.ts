import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { listTags, createTag, updateTag, deleteTag } from "../services/conversation.service";
import type { CreateTagInput } from "../types";

export function useTags() {
  const queryClient = useQueryClient();
  const { scope, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const tagsQuery = useQuery({
    queryKey: ["conversation-tags", scope?.tenantId],
    queryFn: async () => {
      if (!scope) throw new Error("No scope available");
      return listTags(scope);
    },
    enabled: !!scope && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-tags"] });
      toast({
        title: "Etiqueta creada",
        description: "La etiqueta ha sido creada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear etiqueta",
        description: error.message || "No se pudo crear la etiqueta",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateTagInput> }) =>
      updateTag(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-tags"] });
      toast({
        title: "Etiqueta actualizada",
        description: "La etiqueta ha sido actualizada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar etiqueta",
        description: error.message || "No se pudo actualizar la etiqueta",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-tags"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Etiqueta eliminada",
        description: "La etiqueta ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar etiqueta",
        description: error.message || "No se pudo eliminar la etiqueta",
        variant: "destructive",
      });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    isFetching: tagsQuery.isFetching,
    error: tagsQuery.error,
    refetch: tagsQuery.refetch,
    createTag: createMutation.mutate,
    createTagAsync: createMutation.mutateAsync,
    updateTag: updateMutation.mutate,
    updateTagAsync: updateMutation.mutateAsync,
    deleteTag: deleteMutation.mutate,
    deleteTagAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
