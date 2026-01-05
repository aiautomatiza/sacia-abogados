import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as customFieldsService from '../services/custom-fields.service';
import type { CustomField } from '../types';
import { toast } from 'sonner';

export function useCustomFields(tenantId?: string) {
  return useQuery({
    queryKey: ['custom-fields', tenantId],
    queryFn: () => customFieldsService.getCustomFields(tenantId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomFieldMutations(tenantId?: string) {
  const queryClient = useQueryClient();

  const createField = useMutation({
    mutationFn: (field: Omit<CustomField, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) =>
      customFieldsService.createCustomField(field, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      toast.success('Campo creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear campo');
    },
  });

  const updateField = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CustomField> }) =>
      customFieldsService.updateCustomField(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      toast.success('Campo actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar campo');
    },
  });

  const deleteField = useMutation({
    mutationFn: (id: string) => customFieldsService.deleteCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      toast.success('Campo eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar campo');
    },
  });

  return {
    createField,
    updateField,
    deleteField,
  };
}
