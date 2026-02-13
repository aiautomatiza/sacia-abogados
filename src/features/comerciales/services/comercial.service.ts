import { supabase } from '@/integrations/supabase/client';
import type { ComercialRole } from '@/types/comercial';
import type { Comercial, UpdateComercialRoleInput, AssignContactInput } from '../types';

/**
 * List all comerciales (profiles with any role) for a tenant
 */
export async function listComerciales(tenantId: string): Promise<Comercial[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, comercial_role, location_id, tenant_id, external_id')
    .eq('tenant_id', tenantId)
    .order('email', { ascending: true });

  if (error) throw error;
  return (data || []) as Comercial[];
}

/**
 * Update a user's comercial role and optional location.
 * Uses an RPC (SECURITY DEFINER) that enforces hierarchy at the DB level.
 */
export async function updateComercialRole(input: UpdateComercialRoleInput): Promise<void> {
  const { error } = await supabase.rpc('update_comercial_role', {
    target_user_id: input.userId,
    new_role: input.comercialRole,
    new_location_id: input.comercialRole === 'director_sede' ? (input.locationId ?? null) : null,
    new_external_id: input.externalId ?? null,
  });

  if (error) throw new Error(error.message);
}

/**
 * Remove a user's comercial role (revert to full access).
 * Uses an RPC (SECURITY DEFINER) that enforces hierarchy at the DB level.
 */
export async function removeComercialRole(userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_comercial_role', {
    target_user_id: userId,
  });

  if (error) throw new Error(error.message);
}

/**
 * Assign a contact to a comercial user
 */
export async function assignContact(input: AssignContactInput): Promise<void> {
  const updates: Record<string, unknown> = {
    assigned_to: input.assignedTo,
    updated_at: new Date().toISOString(),
  };

  if (input.locationId !== undefined) {
    updates.location_id = input.locationId;
  }

  const { error } = await supabase
    .from('crm_contacts')
    .update(updates)
    .eq('id', input.contactId);

  if (error) throw error;
}

/**
 * Bulk assign contacts to a comercial user
 */
export async function assignContactsBulk(
  contactIds: string[],
  assignedTo: string | null,
  locationId?: string | null
): Promise<void> {
  const updates: Record<string, unknown> = {
    assigned_to: assignedTo,
    updated_at: new Date().toISOString(),
  };

  if (locationId !== undefined) {
    updates.location_id = locationId;
  }

  const { error } = await supabase
    .from('crm_contacts')
    .update(updates)
    .in('id', contactIds);

  if (error) throw error;
}
