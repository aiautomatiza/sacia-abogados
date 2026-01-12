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
 */
export async function getContactStatuses(
  tenantId: string,
  filters: ContactStatusFilters = {}
): Promise<ContactStatusWithUsageCount[]> {
  let query = supabase
    .from('crm_contact_statuses')
    .select(`
      *,
      contacts_count:crm_contacts(count)
    `)
    .eq('tenant_id', tenantId);

  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  query = query.order('display_order', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    display_order: row.display_order,
    is_default: row.is_default,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    usage_count: Array.isArray(row.contacts_count) ? row.contacts_count[0]?.count || 0 : 0,
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
