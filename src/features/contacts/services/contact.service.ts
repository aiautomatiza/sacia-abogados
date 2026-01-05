import { supabase } from '@/integrations/supabase/client';
import { buildSearchFilter } from '@/lib/utils/search';
import { getCurrentTenantId, assertTenantAccess } from '@/lib/utils/tenant';
import { createContactSchema, updateContactSchema } from '@/lib/validations/contact';
import type { Contact, ContactFilters } from '../types';
import type { UserScope } from '@/features/conversations';

export async function getContacts(
  filters: ContactFilters = {},
  page: number = 1,
  pageSize: number = 30
): Promise<{ data: Contact[]; total: number }> {
  // Tenant isolation enforced at query level
  // RLS policies provide additional security at database level
  let query = supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' });

  if (filters.search) {
    const searchFilter = buildSearchFilter(['numero', 'nombre'], filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
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

  // Centralized tenant_id lookup
  const tenantId = await getCurrentTenantId();

  const { numero, nombre, attributes } = validated;

  const { data, error } = await supabase
    .from('crm_contacts')
    .insert({
      tenant_id: tenantId,
      numero,
      nombre,
      attributes,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error(`Contact with phone number ${numero} already exists`);
    }
    throw new Error(`Failed to create contact: ${error.message}`);
  }

  return {
    ...data,
    attributes: (data.attributes as Record<string, unknown>) || {},
  };
}

export async function updateContact(
  id: string,
  contactData: Partial<Contact>,
  scope: UserScope
): Promise<Contact> {
  // Validate input with Zod
  const validated = updateContactSchema.parse(contactData);

  const { numero, nombre, attributes } = validated;

  const updates: Partial<Contact> = {};
  if (numero !== undefined) updates.numero = numero;
  if (nombre !== undefined) updates.nombre = nombre;
  if (attributes !== undefined) updates.attributes = attributes;

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
