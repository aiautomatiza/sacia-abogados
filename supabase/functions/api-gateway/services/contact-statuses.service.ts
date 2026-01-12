/**
 * @fileoverview Contact Statuses Service
 * @description Business logic for managing contact statuses in the CRM
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';
import { ApiError } from '../types/shared.types.ts';
import { assertTenantAccess } from '../middleware/tenant-isolation.ts';

/**
 * Contact Status type definition
 */
export interface ContactStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon: string | null;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Contact Status with usage count
 */
export interface ContactStatusWithUsageCount extends ContactStatus {
  usage_count: number;
}

/**
 * Contact Status History entry
 */
export interface ContactStatusHistory {
  id: string;
  contact_id: string;
  status_id: string | null;
  previous_status_id: string | null;
  changed_by: string;
  changed_at: string;
  tenant_id: string;
  notes: string | null;
  created_at: string;
}

/**
 * Filters for contact status queries
 */
export interface ContactStatusFilters {
  is_active?: boolean;
  include_usage_count?: boolean;
}

/**
 * Create Contact Status input
 */
export interface CreateContactStatusInput {
  name: string;
  color: string;
  icon?: string | null;
  is_default?: boolean;
}

/**
 * Update Contact Status input
 */
export interface UpdateContactStatusInput {
  name?: string;
  color?: string;
  icon?: string | null;
  is_default?: boolean;
}

/**
 * Reorder statuses input
 */
export interface ReorderStatusesInput {
  id: string;
  display_order: number;
}

/**
 * Gets list of contact statuses for the user's tenant
 * Optionally includes usage count
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param filters - Optional filters
 * @returns Contact statuses array
 */
export async function getContactStatuses(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  filters: ContactStatusFilters = {}
): Promise<ContactStatusWithUsageCount[]> {
  console.log('[contact-statuses] Getting statuses for tenant:', userScope.tenantId);

  let query = supabaseClient
    .from('crm_contact_statuses')
    .select('*');

  // Filter by tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  } else if (userScope.tenantId) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  // Filter by is_active if specified
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data, error } = await query.order('display_order', { ascending: true });

  if (error) {
    console.error('[contact-statuses] Error fetching statuses:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  const statuses = data || [];

  // Include usage count if requested
  if (filters.include_usage_count) {
    const statusesWithCount: ContactStatusWithUsageCount[] = [];

    for (const status of statuses) {
      const { count, error: countError } = await supabaseClient
        .from('crm_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', status.tenant_id)
        .eq('status_id', status.id);

      if (countError) {
        console.error('[contact-statuses] Error counting usage for status:', status.id, countError);
        statusesWithCount.push({ ...status, usage_count: 0 });
      } else {
        statusesWithCount.push({ ...status, usage_count: count || 0 });
      }
    }

    return statusesWithCount;
  }

  // Return without usage count
  return statuses.map(s => ({ ...s, usage_count: 0 }));
}

/**
 * Gets a single contact status by ID
 * Validates tenant ownership
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Status ID
 * @returns Contact status
 */
export async function getContactStatus(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<ContactStatus> {
  console.log('[contact-statuses] Getting status:', id);

  let query = supabaseClient
    .from('crm_contact_statuses')
    .select('*')
    .eq('id', id);

  // Filter by tenant for non-super-admins
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[contact-statuses] Error fetching status:', error);
    if (error.code === 'PGRST116') {
      throw new ApiError('Contact status not found or access denied', 404, 'NOT_FOUND');
    }
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  // Defense in depth: validate tenant access
  assertTenantAccess(data.tenant_id, userScope, 'contact status');

  return data;
}

/**
 * Creates a new contact status
 * Automatically assigns next display_order
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param statusData - Status data
 * @returns Created contact status
 */
export async function createContactStatus(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  statusData: CreateContactStatusInput
): Promise<ContactStatus> {
  console.log('[contact-statuses] Creating status for tenant:', userScope.tenantId);

  // Super admins cannot create statuses without a tenant
  if (userScope.isSuperAdmin && !userScope.tenantId) {
    throw new ApiError('Super admins must specify a tenant to create statuses', 400);
  }

  // Get next display_order
  const { data: maxOrder, error: maxOrderError } = await supabaseClient
    .from('crm_contact_statuses')
    .select('display_order')
    .eq('tenant_id', userScope.tenantId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxOrderError) {
    console.error('[contact-statuses] Error getting max display_order:', maxOrderError);
    throw new ApiError('Error calculating display order', 500, 'DATABASE_ERROR');
  }

  const nextOrder = (maxOrder?.display_order ?? -1) + 1;

  // Create status
  const { data, error } = await supabaseClient
    .from('crm_contact_statuses')
    .insert({
      tenant_id: userScope.tenantId,
      name: statusData.name,
      color: statusData.color,
      icon: statusData.icon || null,
      is_default: statusData.is_default || false,
      display_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[contact-statuses] Error creating status:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return data;
}

/**
 * Updates an existing contact status
 * Validates tenant ownership before update
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Status ID
 * @param updates - Partial status updates
 * @returns Updated contact status
 */
export async function updateContactStatus(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string,
  updates: UpdateContactStatusInput
): Promise<ContactStatus> {
  console.log('[contact-statuses] Updating status:', id);

  const updateData: any = {};

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.color !== undefined) {
    updateData.color = updates.color;
  }

  if (updates.icon !== undefined) {
    updateData.icon = updates.icon;
  }

  if (updates.is_default !== undefined) {
    updateData.is_default = updates.is_default;
  }

  // Build update query with tenant filter
  let query = supabaseClient
    .from('crm_contact_statuses')
    .update(updateData)
    .eq('id', id);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('[contact-statuses] Error updating status:', error);

    if (error.code === 'PGRST116') {
      throw new ApiError('Contact status not found or access denied', 404, 'NOT_FOUND');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  // Defense in depth: validate tenant access
  assertTenantAccess(data.tenant_id, userScope, 'contact status');

  return data;
}

/**
 * Soft deletes a contact status (sets is_active = false)
 * Validates tenant ownership before delete
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Status ID
 */
export async function deleteContactStatus(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<void> {
  console.log('[contact-statuses] Deleting (soft) status:', id);

  let query = supabaseClient
    .from('crm_contact_statuses')
    .update({ is_active: false })
    .eq('id', id);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { error } = await query;

  if (error) {
    console.error('[contact-statuses] Error deleting status:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Reorders contact statuses by updating display_order for multiple statuses
 * Uses a transaction to ensure consistency
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param reorderData - Array of {id, display_order}
 */
export async function reorderContactStatuses(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  reorderData: ReorderStatusesInput[]
): Promise<void> {
  console.log('[contact-statuses] Reordering statuses, count:', reorderData.length);

  if (reorderData.length === 0) {
    throw new ApiError('No statuses provided for reordering', 400, 'INVALID_INPUT');
  }

  // Update each status individually
  // Note: Supabase doesn't support true transactions in the REST API
  // If one fails, others may have succeeded
  for (const item of reorderData) {
    let query = supabaseClient
      .from('crm_contact_statuses')
      .update({ display_order: item.display_order })
      .eq('id', item.id);

    // Non-super-admins must match tenant
    if (!userScope.isSuperAdmin) {
      query = query.eq('tenant_id', userScope.tenantId);
    }

    const { error } = await query;

    if (error) {
      console.error('[contact-statuses] Error reordering status:', item.id, error);
      throw new ApiError(`Error reordering status ${item.id}`, 500, 'DATABASE_ERROR');
    }
  }
}

/**
 * Updates the status assignment for a contact
 * Creates a history entry automatically via database trigger
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param contactId - Contact ID
 * @param statusId - Status ID (or null to clear)
 */
export async function updateContactStatusAssignment(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  contactId: string,
  statusId: string | null
): Promise<void> {
  console.log('[contact-statuses] Updating contact status assignment:', contactId, statusId);

  const updateData: any = {
    status_id: statusId,
    status_updated_at: new Date().toISOString(),
    status_updated_by: userScope.userId,
  };

  let query = supabaseClient
    .from('crm_contacts')
    .update(updateData)
    .eq('id', contactId);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { error } = await query;

  if (error) {
    console.error('[contact-statuses] Error updating contact status:', error);

    if (error.code === 'PGRST116') {
      throw new ApiError('Contact not found or access denied', 404, 'NOT_FOUND');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Gets status change history for a specific contact
 * Includes related status details and user email
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param contactId - Contact ID
 * @returns Status history entries
 */
export async function getContactStatusHistory(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  contactId: string
): Promise<ContactStatusHistory[]> {
  console.log('[contact-statuses] Getting status history for contact:', contactId);

  let query = supabaseClient
    .from('crm_contact_status_history')
    .select(`
      *,
      status:crm_contact_statuses!crm_contact_status_history_status_id_fkey(*),
      previous_status:crm_contact_statuses!crm_contact_status_history_previous_status_id_fkey(*),
      changed_by_user:profiles!crm_contact_status_history_changed_by_fkey(email)
    `)
    .eq('contact_id', contactId);

  // Filter by tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.order('changed_at', { ascending: false });

  if (error) {
    console.error('[contact-statuses] Error fetching status history:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return data || [];
}

/**
 * Gets recent status changes across all contacts for the tenant
 * Useful for activity feeds and dashboards
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param limit - Maximum number of records to return
 * @returns Recent status history entries
 */
export async function getRecentStatusChanges(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  limit: number = 10
): Promise<ContactStatusHistory[]> {
  console.log('[contact-statuses] Getting recent status changes, limit:', limit);

  let query = supabaseClient
    .from('crm_contact_status_history')
    .select(`
      *,
      contact:crm_contacts!inner(numero, nombre),
      status:crm_contact_statuses!crm_contact_status_history_status_id_fkey(*),
      previous_status:crm_contact_statuses!crm_contact_status_history_previous_status_id_fkey(*),
      changed_by_user:profiles!crm_contact_status_history_changed_by_fkey(email)
    `);

  // Filter by tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  } else if (userScope.tenantId) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[contact-statuses] Error fetching recent changes:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return data || [];
}
