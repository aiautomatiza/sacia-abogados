import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as customFieldsService from '../services/custom-fields.service';
import * as customFieldsApi from '@/lib/api/endpoints/custom-fields.api';
import { ApiError } from '@/lib/api/client';
import type { CustomField } from '../types';
import { toast } from 'sonner';

// Feature flag to enable/disable API Gateway
const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

/**
 * Hook to fetch custom fields
 * Uses API Gateway if enabled, otherwise direct Supabase access
 */
export function useCustomFields(tenantId?: string) {
  return useQuery({
    queryKey: ['custom-fields', tenantId],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: Call API Gateway
        const response = await customFieldsApi.getCustomFields();
        return response.data;
      } else {
        // OLD: Direct Supabase (fallback)
        return customFieldsService.getCustomFields(tenantId);
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for custom field mutations (create, update, delete)
 * Uses API Gateway if enabled, otherwise direct Supabase access
 */
export function useCustomFieldMutations(tenantId?: string) {
  const queryClient = useQueryClient();

  const createField = useMutation({
    mutationFn: async (field: Omit<CustomField, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
      if (USE_API_GATEWAY) {
        // NEW: Call API Gateway
        return customFieldsApi.createCustomField(field);
      } else {
        // OLD: Direct Supabase (fallback)
        return customFieldsService.createCustomField(field, tenantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] }); // Also invalidate without tenantId
      toast.success('Campo creado exitosamente');
    },
    onError: (error: any) => {
      const message = error instanceof ApiError ? error.message : (error.message || 'Error al crear campo');
      toast.error(message);
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomField> }) => {
      if (USE_API_GATEWAY) {
        // NEW: Call API Gateway
        return customFieldsApi.updateCustomField(id, updates);
      } else {
        // OLD: Direct Supabase (fallback)
        return customFieldsService.updateCustomField(id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast.success('Campo actualizado exitosamente');
    },
    onError: (error: any) => {
      const message = error instanceof ApiError ? error.message : (error.message || 'Error al actualizar campo');
      toast.error(message);
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      if (USE_API_GATEWAY) {
        // NEW: Call API Gateway
        return customFieldsApi.deleteCustomField(id);
      } else {
        // OLD: Direct Supabase (fallback)
        return customFieldsService.deleteCustomField(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast.success('Campo eliminado exitosamente');
    },
    onError: (error: any) => {
      const message = error instanceof ApiError ? error.message : (error.message || 'Error al eliminar campo');
      toast.error(message);
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (fields: Array<{ id: string; display_order: number }>) => {
      if (USE_API_GATEWAY) {
        // NEW: Call API Gateway
        return customFieldsApi.reorderFields(fields);
      } else {
        // OLD: Direct Supabase (fallback)
        return customFieldsService.reorderFields(fields);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast.success('Campos reordenados exitosamente');
    },
    onError: (error: any) => {
      const message = error instanceof ApiError ? error.message : (error.message || 'Error al reordenar campos');
      toast.error(message);
    },
  });

  return {
    createField,
    updateField,
    deleteField,
    reorderFields,
  };
}
