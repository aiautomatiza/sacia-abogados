/**
 * @fileoverview Contact Status Mutations Hooks
 * @description React Query mutation hooks for managing contact statuses (create, update, delete, reorder)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import * as statusApi from '@/lib/api/endpoints/contact-statuses.api';
import * as statusService from '../services/contact-status.service';
import type { ContactStatusFormData } from '../types';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

/**
 * Mutations for contact status management
 *
 * @returns Object with all status mutation functions
 *
 * @example
 * const { createStatus, updateStatus, deleteStatus, reorderStatuses } = useContactStatusMutations();
 *
 * // Create new status
 * createStatus.mutate({ name: 'VIP', color: '#8b5cf6', icon: 'star' });
 */
export function useContactStatusMutations() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  /**
   * Create new contact status
   */
  const createStatus = useMutation({
    mutationFn: async (data: ContactStatusFormData) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return statusApi.createContactStatus({
          name: data.name,
          color: data.color,
          icon: data.icon,
          is_default: data.is_default || false,
        });
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return statusService.createContactStatus({
          tenant_id: scope.tenantId,
          name: data.name,
          color: data.color,
          icon: data.icon || null,
          is_default: data.is_default || false,
          display_order: 0,
          is_active: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      toast.success('Estado creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear estado');
    },
  });

  /**
   * Update existing contact status
   */
  const updateStatus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContactStatusFormData> }) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return statusApi.updateContactStatus(id, {
          name: data.name,
          color: data.color,
          icon: data.icon,
          is_default: data.is_default,
        });
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return statusService.updateContactStatus(id, scope.tenantId, {
          name: data.name,
          color: data.color,
          icon: data.icon,
          is_default: data.is_default,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Estado actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar estado');
    },
  });

  /**
   * Delete (soft delete) contact status
   */
  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return statusApi.deleteContactStatus(id);
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return statusService.deleteContactStatus(id, scope.tenantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Estado eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar estado');
    },
  });

  /**
   * Reorder statuses (bulk update display_order)
   */
  const reorderStatuses = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const statuses = orderedIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return statusApi.reorderContactStatuses(statuses);
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return statusService.reorderContactStatuses(scope.tenantId, orderedIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      toast.success('Orden actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reordenar estados');
    },
  });

  return {
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
  };
}
