import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateComercialRole, removeComercialRole } from '../services/comercial.service';
import { COMERCIALES_QUERY_KEY } from './useComerciales';
import { TENANT_AGENTS_QUERY_KEY } from '@/features/appointments/hooks/use-tenant-agents';
import type { UpdateComercialRoleInput } from '../types';

export function useComercialMutations() {
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: (input: UpdateComercialRoleInput) => updateComercialRole(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMERCIALES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TENANT_AGENTS_QUERY_KEY] });
      toast.success('Rol comercial actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar rol comercial');
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (userId: string) => removeComercialRole(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMERCIALES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TENANT_AGENTS_QUERY_KEY] });
      toast.success('Rol comercial eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar rol comercial');
    },
  });

  return {
    updateRole: updateRoleMutation,
    removeRole: removeRoleMutation,
  };
}
