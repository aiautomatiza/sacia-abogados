import { supabase } from '@/integrations/supabase/client';
import { buildSearchFilter } from '@/lib/utils/search';
import { getCurrentTenantId, assertTenantAccess } from '@/lib/utils/tenant';
import { createContactSchema, updateContactSchema } from '@/lib/validations/contact';
import { normalizePhone } from '@/lib/utils/phone';
import { applyContactVisibilityFilter } from '@/lib/utils/comercial-filters';
import type { Contact, ContactFilters } from '../types';
import type { UserScope } from '@/features/conversations';

export async function getContacts(
  filters: ContactFilters = {},
  page: number = 1,
  pageSize: number = 30,
  scope?: UserScope
): Promise<{ data: Contact[]; total: number }> {
  // Tenant isolation enforced at query level
  // RLS policies provide additional security at database level
  let query = supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' });

  // Apply comercial role-based visibility filter
  if (scope) {
    query = applyContactVisibilityFilter(query, scope);
  }

  if (filters.search) {
    const searchFilter = buildSearchFilter(['numero', 'nombre'], filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  // Filter by status
  if (filters.status_ids && filters.status_ids.length > 0) {
    query = query.in('status_id', filters.status_ids);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data || []).map(row => ({
      ...row,
      attributes: (row.attributes as Record<string, unknown>) || {},
    })),
    total: count || 0,
  };
}

export async function getContact(id: string, scope: UserScope): Promise<Contact> {
  const { data, error } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', scope.tenantId)
    .single();

  if (error) throw error;

  // Application-level tenant validation (defense in depth)
  await assertTenantAccess(data.tenant_id, scope, 'contact');

  return {
    ...data,
    attributes: (data.attributes as Record<string, unknown>) || {},
  };
}

export async function createContact(contactData: Partial<Contact>): Promise<Contact> {
  // Validate input with Zod
  const validated = createContactSchema.parse(contactData);

  const { numero, nombre, external_crm_id, attributes, ...customFields } = validated;

  // Merge existing attributes with custom fields from form
  const mergedAttributes = {
    ...attributes,
    ...customFields,
  };

  // Call edge function to create contact and notify middleware
  const { data, error } = await supabase.functions.invoke('create-contact', {
    body: {
      numero,
      nombre,
      external_crm_id: external_crm_id || null,
      attributes: mergedAttributes,
    },
  });

  if (error) {
    throw new Error(`Failed to create contact: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.contact) {
    throw new Error('Failed to create contact: Invalid response from server');
  }

  return {
    ...data.contact,
    attributes: (data.contact.attributes as Record<string, unknown>) || {},
  };
}

export async function updateContact(
  id: string,
  contactData: Partial<Contact>,
  scope: UserScope
): Promise<Contact> {
  // Validate input with Zod
  const validated = updateContactSchema.parse(contactData);

  const { numero, nombre, external_crm_id, attributes, ...customFields } = validated;

  // Merge existing attributes with custom fields from form
  const mergedAttributes = {
    ...attributes,
    ...customFields,
  };

  const updates: Partial<Contact> = {};
  if (numero !== undefined) updates.numero = normalizePhone(numero);
  if (nombre !== undefined) updates.nombre = nombre;
  if (external_crm_id !== undefined) updates.external_crm_id = external_crm_id || null;
  if (Object.keys(mergedAttributes).length > 0) updates.attributes = mergedAttributes;

  const { data, error } = await supabase
    .from('crm_contacts')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', scope.tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Contact with phone number ${numero} already exists`);
    }
    throw new Error(`Failed to update contact: ${error.message}`);
  }

  // Application-level tenant validation (defense in depth)
  await assertTenantAccess(data.tenant_id, scope, 'contact');

  return {
    ...data,
    attributes: (data.attributes as Record<string, unknown>) || {},
  };
}

export async function deleteContact(id: string, scope: UserScope): Promise<void> {
  const { error } = await supabase
    .from('crm_contacts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', scope.tenantId);

  if (error) throw error;
}

export async function deleteContactsBulk(ids: string[], scope: UserScope): Promise<void> {
  const { error } = await supabase
    .from('crm_contacts')
    .delete()
    .in('id', ids)
    .eq('tenant_id', scope.tenantId);

  if (error) throw error;
}

/**
 * Update contact status (triggers history logging automatically)
 */
export async function updateContactStatus(
  contactId: string,
  statusId: string | null,
  tenantId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('crm_contacts')
    .update({
      status_id: statusId,
      status_updated_at: new Date().toISOString(),
      status_updated_by: userId,
    })
    .eq('id', contactId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`Error al cambiar estado: ${error.message}`);
}
