import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { updateConversationStatus, deleteConversation } from "../services/conversation.service";
import { useAuth } from "@/contexts/auth-context";

export function useConversationActions() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  const archiveMutation = useMutation({
    mutationFn: (conversationId: string) => {
      if (!scope) {
        throw new Error('User scope not available');
      }
      return updateConversationStatus(conversationId, "archived", scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Conversación archivada",
        description: "La conversación se ha archivado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al archivar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => {
      if (!scope) {
        throw new Error('User scope not available');
      }
      return deleteConversation(conversationId, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Conversación eliminada",
        description: "La conversación y sus mensajes han sido eliminados",
        variant: "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    archiveConversation: archiveMutation.mutate,
    deleteConversation: deleteMutation.mutate,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
