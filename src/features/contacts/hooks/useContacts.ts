import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contactService from '../services/contact.service';
import * as contactsApi from '@/lib/api/endpoints/contacts.api';
import type { Contact, ContactFilters } from '../types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useContacts(
  filters: ContactFilters = {},
  page: number = 1,
  pageSize: number = 30
) {
  const { scope } = useAuth();

  return useQuery({
    // SECURITY: Include tenantId in query key to prevent cache cross-contamination
    queryKey: ['contacts', scope?.tenantId, filters, page, pageSize],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const response = await contactsApi.getContacts({
          search: filters.search,
          page,
          pageSize
        });
        return {
          data: response.data,
          total: response.meta.total,
        };
      } else {
        // OLD: Direct Supabase
        return contactService.getContacts(filters, page, pageSize);
      }
    },
    enabled: !!scope?.tenantId,
  });
}

export function useContact(id: string) {
  const { scope } = useAuth();

  return useQuery({
    // SECURITY: Include tenantId in query key to prevent cache cross-contamination
    queryKey: ['contact', scope?.tenantId, id],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return contactsApi.getContact(id);
      } else {
        // OLD: Direct Supabase
        if (!scope) {
          throw new Error('User scope not available');
        }
        return contactService.getContact(id, scope);
      }
    },
    enabled: !!id && (USE_API_GATEWAY ? true : !!scope),
  });
}

export function useContactMutations() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  const createContact = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return contactsApi.createContact({
          numero: data.numero!,
          nombre: data.nombre,
          attributes: data.attributes,
        });
      } else {
        // OLD: Direct Supabase
        return contactService.createContact(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear contacto');
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return contactsApi.updateContact(id, {
          numero: data.numero,
          nombre: data.nombre,
          attributes: data.attributes,
        });
      } else {
        // OLD: Direct Supabase
        if (!scope) {
          throw new Error('User scope not available');
        }
        return contactService.updateContact(id, data, scope);
      }
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
    mutationFn: async (id: string) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return contactsApi.deleteContact(id);
      } else {
        // OLD: Direct Supabase
        if (!scope) {
          throw new Error('User scope not available');
        }
        return contactService.deleteContact(id, scope);
      }
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
    mutationFn: async (ids: string[]) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return contactsApi.deleteContactsBulk(ids);
      } else {
        // OLD: Direct Supabase
        if (!scope) {
          throw new Error('User scope not available');
        }
        return contactService.deleteContactsBulk(ids, scope);
      }
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
