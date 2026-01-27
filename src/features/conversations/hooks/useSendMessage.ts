import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessage } from "../services/conversation.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { SendMessageInput, MessageWithSender } from "../types";

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { scope } = useAuth();

  const mutation = useMutation({
    mutationFn: (input: SendMessageInput) => {
      if (!scope) {
        throw new Error("User scope not available");
      }
      // SECURITY: Pass scope for tenant validation
      return sendMessage(input, scope);
    },
    onMutate: async (variables) => {
      const queryKey = ["conversation-messages", variables.conversation_id];

      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const optimisticMessage: MessageWithSender = {
          id: `temp-${Date.now()}`,
          conversation_id: variables.conversation_id,
          sender_type: "agent",
          sender_id: null,
          content: variables.content || null,
          content_type: variables.content_type,
          file_url: variables.file_url || null,
          file_name: variables.file_name || null,
          file_type: variables.file_type || null,
          file_size: variables.file_size || null,
          delivery_status: "sending",
          external_message_id: null,
          error_message: null,
          replied_to_message_id: variables.replied_to_message_id || null,
          metadata: variables.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // TIER S: Mensajes ahora vienen en orden ASC, agregar al final
        return {
          ...old,
          messages: [...(old.messages || []), optimisticMessage],
          total: (old.total || 0) + 1,
        };
      });

      return { previousMessages };
    },
    onSuccess: (data, variables) => {
      // Actualizar el mensaje temporal con el mensaje real (que incluye el ID real)
      queryClient.setQueryData(
        ["conversation-messages", variables.conversation_id],
        (old: any) => {
          if (!old?.messages) return old;

          // Reemplazar mensaje temporal con el mensaje real del servidor
          return {
            ...old,
            messages: old.messages.map((m: MessageWithSender) => {
              // Si es un mensaje temporal con el mismo contenido, reemplazarlo
              if (m.id.startsWith('temp-') && data && m.content === data.content) {
                return data;
              }
              return m;
            }),
          };
        }
      );

      // Invalidar conversaciones para actualizar last_message_preview, etc.
      queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });

      // Invalidar mensajes después de un delay para obtener delivery_status actualizado
      // La Edge Function tarda un poco en procesar y actualizar el mensaje
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["conversation-messages", variables.conversation_id],
        });
      }, 2000); // 2 segundos de delay para que la Edge Function procese
    },
    onError: (error: any, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["conversation-messages", variables.conversation_id],
          context.previousMessages
        );
      }

      toast({
        title: "Error al enviar mensaje",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
