/**
 * @fileoverview Custom Fields Service
 * @description Business logic for managing custom fields in the CRM
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';
import { ApiError } from '../types/shared.types.ts';

/**
 * Custom Field type definition
 */
export interface CustomField {
  id: string;
  tenant_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'date' | 'textarea' | 'checkbox' | 'url';
  options: string[];
  required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create Custom Field input (without auto-generated fields)
 */
export type CreateCustomFieldInput = Omit<CustomField, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>;

/**
 * Update Custom Field input (partial)
 */
export type UpdateCustomFieldInput = Partial<CreateCustomFieldInput>;

/**
 * Gets all custom fields for the user's tenant
 * Ordered by display_order ascending
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope (userId, tenantId, isSuperAdmin)
 * @returns Array of custom fields
 */
export async function getCustomFields(
  supabaseClient: SupabaseClient,
  userScope: UserScope
): Promise<CustomField[]> {
  console.log('[custom-fields] Getting custom fields for tenant:', userScope.tenantId);

  let query = supabaseClient
    .from('custom_fields')
    .select('*')
    .order('display_order', { ascending: true });

  // Filter by tenant (super admins need to specify tenant explicitly)
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  } else {
    // Super admins must filter by their own tenant if they have one
    if (userScope.tenantId) {
      query = query.eq('tenant_id', userScope.tenantId);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[custom-fields] Error fetching custom fields:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  // Transform data to ensure proper types
  return (data || []).map(row => ({
    ...row,
    field_type: row.field_type as CustomField['field_type'],
    options: (row.options as string[]) || [],
  }));
}

/**
 * Creates a new custom field for the user's tenant
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param field - Custom field data (without id, tenant_id, timestamps)
 * @returns Created custom field
 */
export async function createCustomField(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  field: CreateCustomFieldInput
): Promise<CustomField> {
  console.log('[custom-fields] Creating custom field for tenant:', userScope.tenantId);

  // Super admins cannot create fields without a tenant
  if (userScope.isSuperAdmin && !userScope.tenantId) {
    throw new ApiError('Super admins must specify a tenant to create custom fields', 400);
  }

  const { data, error } = await supabaseClient
    .from('custom_fields')
    .insert({
      ...field,
      tenant_id: userScope.tenantId,
    })
    .select()
    .single();

  if (error) {
    console.error('[custom-fields] Error creating custom field:', error);

    // Handle duplicate field_name
    if (error.code === '23505') {
      throw new ApiError('A custom field with this name already exists', 409, 'DUPLICATE_FIELD_NAME');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return {
    ...data,
    field_type: data.field_type as CustomField['field_type'],
    options: (data.options as string[]) || [],
  };
}

/**
 * Updates an existing custom field
 * Validates tenant ownership before update
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Custom field ID
 * @param updates - Partial custom field updates
 * @returns Updated custom field
 */
export async function updateCustomField(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string,
  updates: UpdateCustomFieldInput
): Promise<CustomField> {
  console.log('[custom-fields] Updating custom field:', id);

  // Build update query with tenant filter for security
  let query = supabaseClient
    .from('custom_fields')
    .update(updates)
    .eq('id', id);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('[custom-fields] Error updating custom field:', error);

    // Not found or access denied
    if (error.code === 'PGRST116') {
      throw new ApiError('Custom field not found or access denied', 404, 'NOT_FOUND');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return {
    ...data,
    field_type: data.field_type as CustomField['field_type'],
    options: (data.options as string[]) || [],
  };
}

/**
 * Deletes a custom field
 * Validates tenant ownership before delete
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Custom field ID
 */
export async function deleteCustomField(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<void> {
  console.log('[custom-fields] Deleting custom field:', id);

  // Build delete query with tenant filter for security
  let query = supabaseClient
    .from('custom_fields')
    .delete()
    .eq('id', id);

  // Non-super-admins must match tenant
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { error } = await query;

  if (error) {
    console.error('[custom-fields] Error deleting custom field:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Reorders multiple custom fields in a single transaction
 * Updates display_order for each field
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param fields - Array of { id, display_order } to update
 */
export async function reorderFields(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  fields: Array<{ id: string; display_order: number }>
): Promise<void> {
  console.log('[custom-fields] Reordering fields, count:', fields.length);

  // Update each field's display_order
  // Note: This runs in parallel, not a true transaction
  // For production, consider using a database function or RPC
  const updates = fields.map(field =>
    supabaseClient
      .from('custom_fields')
      .update({ display_order: field.display_order })
      .eq('id', field.id)
      .eq('tenant_id', userScope.tenantId) // Security: only update own tenant's fields
  );

  const results = await Promise.all(updates);

  // Check for errors
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    console.error('[custom-fields] Errors reordering fields:', errors);
    throw new ApiError('Failed to reorder some fields', 500, 'REORDER_ERROR');
  }
}
