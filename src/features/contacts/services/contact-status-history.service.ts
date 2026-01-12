/**
 * @fileoverview Contact Status History Service (LEGACY - Direct Supabase)
 * @description Used as fallback when USE_API_GATEWAY=false
 * @deprecated Use API layer instead (contact-status-history.api.ts)
 */

import { supabase } from '@/integrations/supabase/client';
import type { ContactStatusHistory } from '../types';

/**
 * Get status change history for a contact
 */
export async function getContactStatusHistory(
  contactId: string,
  tenantId: string
): Promise<ContactStatusHistory[]> {
  const { data, error } = await supabase
    .from('crm_contact_status_history')
    .select(`
      *,
      status:status_id(id, name, color, icon, display_order, is_default, is_active, tenant_id, created_at, updated_at),
      previous_status:previous_status_id(id, name, color, icon, display_order, is_default, is_active, tenant_id, created_at, updated_at),
      user:changed_by(email)
    `)
    .eq('contact_id', contactId)
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    contact_id: row.contact_id,
    status_id: row.status_id,
    previous_status_id: row.previous_status_id,
    changed_by: row.changed_by,
    changed_at: row.changed_at,
    tenant_id: row.tenant_id,
    notes: row.notes,
    created_at: row.created_at,
    status: row.status || null,
    previous_status: row.previous_status || null,
    changed_by_email: row.user?.email || 'Sistema',
  }));
}

/**
 * Get recent status changes across all contacts (for dashboard)
 */
export async function getRecentStatusChanges(
  tenantId: string,
  limit: number = 10
): Promise<ContactStatusHistory[]> {
  const { data, error } = await supabase
    .from('crm_contact_status_history')
    .select(`
      *,
      contact:contact_id(numero, nombre),
      status:status_id(id, name, color, icon, display_order, is_default, is_active, tenant_id, created_at, updated_at),
      previous_status:previous_status_id(id, name, color, icon, display_order, is_default, is_active, tenant_id, created_at, updated_at),
      user:changed_by(email)
    `)
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    contact_id: row.contact_id,
    status_id: row.status_id,
    previous_status_id: row.previous_status_id,
    changed_by: row.changed_by,
    changed_at: row.changed_at,
    tenant_id: row.tenant_id,
    notes: row.notes,
    created_at: row.created_at,
    status: row.status || null,
    previous_status: row.previous_status || null,
    changed_by_email: row.user?.email || 'Sistema',
  }));
}
