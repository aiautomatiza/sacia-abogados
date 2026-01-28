import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contactService from '../services/contact.service';
import * as contactsApi from '@/lib/api/endpoints/contacts.api';
import * as contactStatusApi from '@/lib/api/endpoints/contact-statuses.api';
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
          status_ids: filters.status_ids,
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
        // Extract core fields and treat remaining properties as custom fields
        const { numero, nombre, status_id, attributes, ...customFields } = data;
        return contactsApi.createContact({
          numero: numero!,
          nombre,
          status_id: status_id ?? undefined,
          attributes: {
            ...attributes,
            ...customFields,
          },
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
        // Extract core fields and treat remaining properties as custom fields
        const { numero, nombre, status_id, attributes, ...customFields } = data;
        return contactsApi.updateContact(id, {
          numero,
          nombre,
          status_id,
          attributes: {
            ...attributes,
            ...customFields,
          },
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

/**
 * Mutation for updating a contact's status
 * - Automatically logs change to history
 * - Updates status_updated_at and status_updated_by
 *
 * @returns Mutation object for updating contact status
 *
 * @example
 * const updateStatus = useContactStatusMutation();
 * updateStatus.mutate({ contactId: 'uuid', statusId: 'status-uuid' });
 */
export function useContactStatusMutation() {
  const queryClient = useQueryClient();
  const { scope } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, statusId }: { contactId: string; statusId: string | null }) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return contactStatusApi.updateContactStatusAssignment(contactId, statusId);
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId || !scope?.userId) {
          throw new Error('User scope not available');
        }
        return contactService.updateContactStatus(
          contactId,
          statusId,
          scope.tenantId,
          scope.userId
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['contact-status-history'] });
      toast.success('Estado actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar estado');
    },
  });
}
