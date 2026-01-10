/**
 * @fileoverview Conversation Mutations with Optimistic Updates
 * @description Mutations para archive, update tags, assign, delete con optimistic UI
 * @performance Respuesta percibida < 50ms, rollback automático en errores
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import {
  updateConversationStatus,
  updateConversationTags,
  assignConversation,
  deleteConversation,
} from '../services/conversation.service';
import * as conversationsApi from '@/lib/api/endpoints/conversations.api';
import type { ConversationStatus, ConversationWithContact } from '../types';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useConversationMutations() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  // Archive conversation with optimistic update
  const archiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return conversationsApi.updateConversation(conversationId, { status: 'archived' });
      } else {
        // OLD: Direct Supabase
        if (!scope) throw new Error('User scope not available');
        return updateConversationStatus(conversationId, 'archived', scope);
      }
    },
    onMutate: async (conversationId) => {
      const queryKey = ['conversations', 'infinite', scope?.tenantId];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to new value
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: ConversationWithContact) =>
              conv.id === conversationId
                ? { ...conv, status: 'archived' as ConversationStatus }
                : conv
            ),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Conversación archivada');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['conversations', 'infinite', scope?.tenantId],
          context.previousData
        );
      }
      toast.error(error.message || 'Error al archivar');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite', scope?.tenantId],
      });
    },
  });

  // Update tags with optimistic update
  const updateTagsMutation = useMutation({
    mutationFn: async ({ conversationId, tags }: { conversationId: string; tags: string[] }) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return conversationsApi.updateConversation(conversationId, { tags });
      } else {
        // OLD: Direct Supabase
        if (!scope) throw new Error('User scope not available');
        return updateConversationTags(conversationId, tags, scope);
      }
    },
    onMutate: async ({ conversationId, tags }) => {
      const queryKey = ['conversations', 'infinite', scope?.tenantId];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: ConversationWithContact) =>
              conv.id === conversationId ? { ...conv, tags } : conv
            ),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Etiquetas actualizadas');
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['conversations', 'infinite', scope?.tenantId],
          context.previousData
        );
      }
      toast.error(error.message || 'Error al actualizar etiquetas');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite', scope?.tenantId],
      });
    },
  });

  // Assign conversation with optimistic update
  const assignMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string | null }) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return conversationsApi.updateConversation(conversationId, { assigned_to: userId });
      } else {
        // OLD: Direct Supabase
        if (!scope) throw new Error('User scope not available');
        return assignConversation(conversationId, userId, scope);
      }
    },
    onMutate: async ({ conversationId, userId }) => {
      const queryKey = ['conversations', 'infinite', scope?.tenantId];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.map((conv: ConversationWithContact) =>
              conv.id === conversationId ? { ...conv, assigned_to: userId } : conv
            ),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Conversación asignada');
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['conversations', 'infinite', scope?.tenantId],
          context.previousData
        );
      }
      toast.error(error.message || 'Error al asignar');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite', scope?.tenantId],
      });
    },
  });

  // Delete conversation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return conversationsApi.deleteConversation(conversationId);
      } else {
        // OLD: Direct Supabase
        if (!scope) throw new Error('User scope not available');
        return deleteConversation(conversationId, scope);
      }
    },
    onMutate: async (conversationId) => {
      const queryKey = ['conversations', 'infinite', scope?.tenantId];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      // Remove from cache immediately
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            conversations: page.conversations.filter(
              (conv: ConversationWithContact) => conv.id !== conversationId
            ),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Conversación eliminada');
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['conversations', 'infinite', scope?.tenantId],
          context.previousData
        );
      }
      toast.error(error.message || 'Error al eliminar');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite', scope?.tenantId],
      });
    },
  });

  return {
    archiveConversation: archiveMutation.mutate,
    updateTags: updateTagsMutation.mutate,
    assignConversation: assignMutation.mutate,
    deleteConversation: deleteMutation.mutate,
    isArchiving: archiveMutation.isPending,
    isUpdatingTags: updateTagsMutation.isPending,
    isAssigning: assignMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
