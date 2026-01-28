/**
 * @fileoverview Contacts Service
 * @description Business logic for managing contacts in the CRM
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';
import { ApiError } from '../types/shared.types.ts';
import { normalizeSpanishPhone } from '../utils/phone.ts';
import { assertTenantAccess } from '../middleware/tenant-isolation.ts';

/**
 * Contact type definition
 */
export interface Contact {
  id: string;
  tenant_id: string;
  numero: string;
  nombre: string | null;
  attributes: Record<string, any>;
  status_id: string | null;
  status_updated_at: string | null;
  status_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Contact filters for search and pagination
 */
export interface ContactFilters {
  search?: string;
  status_ids?: string[];
}

/**
 * Create Contact input
 */
export interface CreateContactInput {
  numero: string;
  nombre?: string;
  attributes?: Record<string, any>;
  status_id?: string | null;
  skip_external_sync?: boolean;
}

/**
 * Update Contact input
 */
export type UpdateContactInput = Partial<Omit<CreateContactInput, 'skip_external_sync'>>;

/**
 * Checks if the tenant has active integrations
 * Used to determine if we should notify external middleware
 */
async function checkActiveIntegrations(
  supabaseClient: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient
      .from('integration_credentials')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('[contacts] Error checking integrations:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('[contacts] Unexpected error checking integrations:', error);
    return false;
  }
}

/**
 * Notifies external middleware about a new or updated contact
 * Only sends if tenant has active integrations and contact has email
 */
async function notifyMiddleware(
  contact: Contact,
  authHeader: string
): Promise<void> {
  const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');

  if (!middlewareUrl) {
    console.warn('[contacts] Middleware URL not configured');
    return;
  }

  try {
    const attributes = contact.attributes || {};
    const email = attributes.email || attributes.Email || '';

    // Email is required by middleware
    if (!email || email.trim() === '') {
      console.warn('[contacts] Contact has no email, skipping middleware sync');
      return;
    }

    const middlewarePayload: any = {
      name: contact.nombre || 'Sin nombre',
      email: email.trim(),
      phone: contact.numero,
    };

    // Add optional fields if present
    if (attributes.company || attributes.Company) {
      middlewarePayload.company = attributes.company || attributes.Company;
    }
    if (attributes.notes || attributes.Notes) {
      middlewarePayload.notes = attributes.notes || attributes.Notes;
    }

    console.log('[contacts] Notifying middleware:', middlewareUrl);

    const response = await fetch(`${middlewareUrl}/api/sync/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(middlewarePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[contacts] Middleware notification failed: ${response.status} - ${errorText}`);
      // Don't fail the contact creation if middleware fails
    } else {
      const result = await response.json();
      console.log('[contacts] Middleware notified successfully:', result);
    }
  } catch (error) {
    console.error('[contacts] Error notifying middleware:', error);
    // Don't fail the contact creation if middleware fails
  }
}

/**
 * Builds search filter for OR query on multiple columns
 */
function buildSearchFilter(columns: string[], searchTerm: string): string {
  if (!searchTerm || searchTerm.trim() === '') return '';

  const sanitized = searchTerm.trim().replace(/[%_]/g, '\\$&');
  return columns
    .map(col => `${col}.ilike.%${sanitized}%`)
    .join(',');
}

/**
 * Gets paginated list of contacts for the user's tenant
 * Supports search filtering by numero and nombre
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param filters - Search filters
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Contacts data and total count
 */
export async function getContacts(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  filters: ContactFilters = {},
  page: number = 1,
  pageSize: number = 30
): Promise<{ data: Contact[]; total: number }> {
  console.log('[contacts] Getting contacts for tenant:', userScope.tenantId);

  let query = supabaseClient
    .from('crm_contacts')
    .select('*', { count: 'exact' });

  // Filter by tenant (super admins need tenant specified)
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  } else if (userScope.tenantId) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  // Apply search filter
  if (filters.search) {
    const searchFilter = buildSearchFilter(['numero', 'nombre'], filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  // Apply status filter (multi-select)
  if (filters.status_ids && filters.status_ids.length > 0) {
    query = query.in('status_id', filters.status_ids);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[contacts] Error fetching contacts:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return {
    data: (data || []).map(row => ({
      ...row,
      attributes: (row.attributes as Record<string, any>) || {},
    })),
    total: count || 0,
  };
}

/**
 * Gets a single contact by ID
 * Validates tenant ownership
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Contact ID
 * @returns Contact data
 */
export async function getContact(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<Contact> {
  console.log('[contacts] Getting contact:', id);

  let query = supabaseClient
    .from('crm_contacts')
    .select('*')
    .eq('id', id);

  // Filter by tenant for non-super-admins
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[contacts] Error fetching contact:', error);
    if (error.code === 'PGRST116') {
      throw new ApiError('Contact not found or access denied', 404, 'NOT_FOUND');
    }
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  // Defense in depth: validate tenant access
  assertTenantAccess(data.tenant_id, userScope, 'contact');

  return {
    ...data,
    attributes: (data.attributes as Record<string, any>) || {},
  };
}

/**
 * Creates a new contact
 * - Normalizes phone number to E.164 format
 * - Checks for duplicates
 * - Notifies external middleware if tenant has active integrations
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param contactData - Contact data
 * @param authHeader - Authorization header for middleware sync
 * @returns Created contact
 */
export async function createContact(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  contactData: CreateContactInput,
  authHeader: string
): Promise<Contact> {
  console.log('[contacts] Creating contact for tenant:', userScope.tenantId);

  // Super admins cannot create contacts without a tenant
  if (userScope.isSuperAdmin && !userScope.tenantId) {
    throw new ApiError('Super admins must specify a tenant to create contacts', 400);
  }

  // Normalize phone number
  const normalizedNumero = normalizeSpanishPhone(contactData.numero);

  if (normalizedNumero !== contactData.numero) {
    console.log(`[contacts] Normalized phone: ${contactData.numero} -> ${normalizedNumero}`);
  }

  // Check for duplicates
  const { data: existing, error: selectError } = await supabaseClient
    .from('crm_contacts')
    .select('id')
    .eq('tenant_id', userScope.tenantId)
    .eq('numero', normalizedNumero)
    .maybeSingle();

  if (selectError) {
    console.error('[contacts] Error checking existing contact:', selectError);
    throw new ApiError('Error checking for duplicate contact', 500, 'DATABASE_ERROR');
  }

  if (existing) {
    throw new ApiError(
      `A contact with phone number ${normalizedNumero} already exists`,
      409,
      'DUPLICATE_CONTACT'
    );
  }

  // Create contact
  const { data, error } = await supabaseClient
    .from('crm_contacts')
    .insert({
      tenant_id: userScope.tenantId,
      numero: normalizedNumero,
      nombre: contactData.nombre || null,
      attributes: contactData.attributes || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[contacts] Error creating contact:', error);

    if (error.code === '23505') {
      throw new ApiError(
        `A contact with phone number ${normalizedNumero} already exists`,
        409,
        'DUPLICATE_CONTACT'
      );
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  const contact: Contact = {
    ...data,
    attributes: (data.attributes as Record<string, any>) || {},
  };

  // Notify middleware if not skipped and tenant has integrations
  const shouldNotifyMiddleware = !contactData.skip_external_sync;

  if (shouldNotifyMiddleware) {
    const hasActiveIntegrations = await checkActiveIntegrations(supabaseClient, userScope.tenantId);

    if (hasActiveIntegrations) {
      // Fire and forget - don't fail contact creation if middleware fails
      notifyMiddleware(contact, authHeader).catch(err => {
        console.error('[contacts] Background middleware notification failed:', err);
      });
    } else {
      console.log('[contacts] No active integrations, skipping middleware notification');
    }
  } else {
    console.log('[contacts] External sync skipped per request parameter');
  }

  return contact;
}

/**
 * Updates an existing contact
 * Validates tenant ownership before update
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Contact ID
 * @param updates - Partial contact updates
 * @returns Updated contact
 */
export async function updateContact(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string,
  updates: UpdateContactInput
): Promise<Contact> {
  console.log('[contacts] Updating contact:', id);

  const updateData: Partial<Contact> = {};

  // Normalize phone if provided
  if (updates.numero !== undefined) {
    updateData.numero = normalizeSpanishPhone(updates.numero);
  }

  if (updates.nombre !== undefined) {
    updateData.nombre = updates.nombre;
  }

  if (updates.attributes !== undefined) {
    updateData.attributes = updates.attributes;
  }

  // Handle status_id update with tracking fields
  if (updates.status_id !== undefined) {
    updateData.status_id = updates.status_id;
    updateData.status_updated_at = new Date().toISOString();
    updateData.status_updated_by = userScope.userId;
  }

  // Build update query with tenant filter
  let query = supabaseClient
    .from('crm_contacts')
    .update(updateData)
    .eq('id', id);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('[contacts] Error updating contact:', error);

    if (error.code === 'PGRST116') {
      throw new ApiError('Contact not found or access denied', 404, 'NOT_FOUND');
    }

    if (error.code === '23505') {
      throw new ApiError(
        `A contact with phone number ${updateData.numero} already exists`,
        409,
        'DUPLICATE_CONTACT'
      );
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  // Defense in depth: validate tenant access
  assertTenantAccess(data.tenant_id, userScope, 'contact');

  return {
    ...data,
    attributes: (data.attributes as Record<string, any>) || {},
  };
}

/**
 * Deletes a contact
 * Validates tenant ownership before delete
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Contact ID
 */
export async function deleteContact(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<void> {
  console.log('[contacts] Deleting contact:', id);

  let query = supabaseClient
    .from('crm_contacts')
    .delete()
    .eq('id', id);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { error } = await query;

  if (error) {
    console.error('[contacts] Error deleting contact:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Deletes multiple contacts in bulk
 * Validates tenant ownership for all contacts
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param ids - Array of contact IDs to delete
 */
export async function deleteContactsBulk(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  ids: string[]
): Promise<void> {
  console.log('[contacts] Bulk deleting contacts, count:', ids.length);

  if (ids.length === 0) {
    throw new ApiError('No contact IDs provided', 400, 'INVALID_INPUT');
  }

  let query = supabaseClient
    .from('crm_contacts')
    .delete()
    .in('id', ids);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { error } = await query;

  if (error) {
    console.error('[contacts] Error bulk deleting contacts:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Updates a contact's status
 * - Validates tenant ownership
 * - Updates status_id, status_updated_at, status_updated_by
 * - Triggers status history logging via database trigger
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param contactId - Contact ID
 * @param statusId - New status ID (null to remove status)
 * @returns Success response
 */
export async function updateContactStatus(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  contactId: string,
  statusId: string | null
): Promise<{ success: boolean }> {
  console.log('[contacts] Updating contact status:', { contactId, statusId });

  // Validate that status exists (if not null)
  if (statusId !== null) {
    const { data: statusData, error: statusError } = await supabaseClient
      .from('crm_contact_statuses')
      .select('id')
      .eq('id', statusId)
      .eq('tenant_id', userScope.tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (statusError) {
      console.error('[contacts] Error validating status:', statusError);
      throw new ApiError('Error validating status', 500, 'DATABASE_ERROR');
    }

    if (!statusData) {
      throw new ApiError('Status not found or inactive', 404, 'STATUS_NOT_FOUND');
    }
  }

  // Update contact with new status
  let query = supabaseClient
    .from('crm_contacts')
    .update({
      status_id: statusId,
      status_updated_at: new Date().toISOString(),
      status_updated_by: userScope.userId,
    })
    .eq('id', contactId);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.select('id').single();

  if (error) {
    console.error('[contacts] Error updating contact status:', error);

    if (error.code === 'PGRST116') {
      throw new ApiError('Contact not found or access denied', 404, 'NOT_FOUND');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  console.log('[contacts] Contact status updated successfully:', contactId);

  return { success: true };
}
