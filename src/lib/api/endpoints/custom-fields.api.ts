/**
 * @fileoverview Custom Fields API Endpoints
 * @description API endpoints for managing custom fields via API Gateway
 */

import { apiRequest } from '../client';
import type { CustomField } from '@/features/contacts/types';

/**
 * API response wrapper for custom fields list
 */
interface CustomFieldsResponse {
  data: CustomField[];
}

/**
 * Input for creating a custom field (without auto-generated fields)
 */
export type CreateCustomFieldInput = Omit<
  CustomField,
  'id' | 'created_at' | 'updated_at' | 'tenant_id'
>;

/**
 * Input for updating a custom field (partial)
 */
export type UpdateCustomFieldInput = Partial<CreateCustomFieldInput>;

/**
 * Gets all custom fields for the current tenant
 *
 * @returns Promise with custom fields response
 *
 * @example
 * const response = await getCustomFields();
 * console.log(response.data); // CustomField[]
 */
export async function getCustomFields(): Promise<CustomFieldsResponse> {
  return apiRequest<CustomFieldsResponse>('/api/custom-fields');
}

/**
 * Creates a new custom field
 *
 * @param field - Custom field data (without id, tenant_id, timestamps)
 * @returns Promise with created custom field
 *
 * @example
 * const field = await createCustomField({
 *   field_name: 'direccion',
 *   field_label: 'Dirección',
 *   field_type: 'text',
 *   required: false,
 *   options: [],
 *   display_order: 0
 * });
 */
export async function createCustomField(
  field: CreateCustomFieldInput
): Promise<CustomField> {
  return apiRequest<CustomField>('/api/custom-fields', {
    method: 'POST',
    body: field,
  });
}

/**
 * Updates an existing custom field
 *
 * @param id - Custom field ID
 * @param updates - Partial custom field updates
 * @returns Promise with updated custom field
 *
 * @example
 * const updated = await updateCustomField('uuid', {
 *   field_label: 'Dirección Completa',
 *   required: true
 * });
 */
export async function updateCustomField(
  id: string,
  updates: UpdateCustomFieldInput
): Promise<CustomField> {
  return apiRequest<CustomField>(`/api/custom-fields/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

/**
 * Deletes a custom field
 *
 * @param id - Custom field ID
 * @returns Promise with success response
 *
 * @example
 * await deleteCustomField('uuid');
 */
export async function deleteCustomField(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/custom-fields/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Reorders multiple custom fields in bulk
 *
 * @param fields - Array of { id, display_order } to update
 * @returns Promise with success response
 *
 * @example
 * await reorderFields([
 *   { id: 'uuid1', display_order: 0 },
 *   { id: 'uuid2', display_order: 1 },
 *   { id: 'uuid3', display_order: 2 }
 * ]);
 */
export async function reorderFields(
  fields: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/api/custom-fields/reorder', {
    method: 'POST',
    body: { fields },
  });
}
