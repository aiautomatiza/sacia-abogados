import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contactService from '../services/contact.service';
import type { Contact, ContactFilters } from '../types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

export function useContacts(
  filters: ContactFilters = {},
  page: number = 1,
  pageSize: number = 30
) {
  return useQuery({
    queryKey: ['contacts', filters, page, pageSize],
    queryFn: () => contactService.getContacts(filters, page, pageSize),
  });
}

export function useContact(id: string) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => {
      if (!scope) {
        throw new Error('User scope not available');
      }
      return contactService.getContact(id, scope);
    },
    enabled: !!id && !!scope,
  });
}

export function useContactMutations() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  const createContact = useMutation({
    mutationFn: (data: Partial<Contact>) => contactService.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear contacto');
    },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) => {
      if (!scope) {
        throw new Error('User scope not available');
      }
      return contactService.updateContact(id, data, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      toast.success('Contacto actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar contacto');
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => {
      if (!scope) {
        throw new Error('User scope not available');
      }
      return contactService.deleteContact(id, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar contacto');
    },
  });

  const deleteContactsBulk = useMutation({
    mutationFn: (ids: string[]) => {
      if (!scope) {
        throw new Error('User scope not available');
      }
      return contactService.deleteContactsBulk(ids, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contactos eliminados exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar contactos');
    },
  });

  return {
    createContact,
    updateContact,
    deleteContact,
    deleteContactsBulk,
  };
}
