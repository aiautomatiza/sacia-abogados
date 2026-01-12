/**
 * @fileoverview Contact Status Service (LEGACY - Direct Supabase)
 * @description Used as fallback when USE_API_GATEWAY=false
 * @deprecated Use API layer instead (contact-statuses.api.ts)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ContactStatusInsert,
  ContactStatusUpdate,
  ContactStatusFilters,
  ContactStatusWithUsageCount,
  ContactStatus,
} from '../types';

/**
 * Get all statuses for a tenant
 * Optimized with single aggregation query instead of N+1
 */
export async function getContactStatuses(
  tenantId: string,
  filters: ContactStatusFilters = {}
): Promise<ContactStatusWithUsageCount[]> {
  // First, get all statuses
  let statusQuery = supabase
    .from('crm_contact_statuses')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters.is_active !== undefined) {
    statusQuery = statusQuery.eq('is_active', filters.is_active);
  }

  if (filters.search) {
    statusQuery = statusQuery.ilike('name', `%${filters.search}%`);
  }

  statusQuery = statusQuery.order('display_order', { ascending: true });

  const { data: statuses, error: statusError } = await statusQuery;

  if (statusError) throw statusError;
  if (!statuses || statuses.length === 0) return [];

  // Get usage counts in a single aggregated query
  const { data: counts, error: countError } = await supabase
    .from('crm_contacts')
    .select('status_id')
    .eq('tenant_id', tenantId)
    .not('status_id', 'is', null);

  if (countError) {
    console.warn('Error fetching usage counts:', countError);
    // Return statuses with 0 counts on error
    return statuses.map(status => ({ ...status, usage_count: 0 }));
  }

  // Build usage count map
  const usageMap = new Map<string, number>();
  (counts || []).forEach(row => {
    const statusId = row.status_id as string;
    usageMap.set(statusId, (usageMap.get(statusId) || 0) + 1);
  });

  // Merge statuses with usage counts
  return statuses.map(status => ({
    ...status,
    usage_count: usageMap.get(status.id) || 0,
  }));
}

/**
 * Get single status by ID
 */
export async function getContactStatus(id: string, tenantId: string): Promise<ContactStatus> {
  const { data, error } = await supabase
    .from('crm_contact_statuses')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create new status
 */
export async function createContactStatus(
  statusData: ContactStatusInsert
): Promise<void> {
  const { error } = await supabase
    .from('crm_contact_statuses')
    .insert(statusData);

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un estado con ese nombre');
    }
    throw new Error(`Error al crear estado: ${error.message}`);
  }
}

/**
 * Update status
 */
export async function updateContactStatus(
  id: string,
  tenantId: string,
  updates: ContactStatusUpdate
): Promise<void> {
  const { error } = await supabase
    .from('crm_contact_statuses')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un estado con ese nombre');
    }
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }
}

/**
 * Delete status (soft delete via is_active)
 */
export async function deleteContactStatus(
  id: string,
  tenantId: string
): Promise<void> {
  // Soft delete to preserve history
  const { error } = await supabase
    .from('crm_contact_statuses')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`Error al eliminar estado: ${error.message}`);
}

/**
 * Reorder statuses
 */
export async function reorderContactStatuses(
  tenantId: string,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    display_order: index,
    tenant_id: tenantId,
  }));

  const { error } = await supabase
    .from('crm_contact_statuses')
    .upsert(updates, { onConflict: 'id' });

  if (error) throw new Error(`Error al reordenar estados: ${error.message}`);
}
