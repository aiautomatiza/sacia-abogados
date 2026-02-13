import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { assignContact, assignContactsBulk } from '../services/comercial.service';
import type { AssignContactInput } from '../types';

export function useAssignContact() {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: (input: AssignContactInput) => assignContact(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto asignado correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al asignar contacto');
    },
  });

  const assignBulkMutation = useMutation({
    mutationFn: ({
      contactIds,
      assignedTo,
      locationId,
    }: {
      contactIds: string[];
      assignedTo: string | null;
      locationId?: string | null;
    }) => assignContactsBulk(contactIds, assignedTo, locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contactos asignados correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al asignar contactos');
    },
  });

  return {
    assignContact: assignMutation,
    assignContactsBulk: assignBulkMutation,
  };
}
