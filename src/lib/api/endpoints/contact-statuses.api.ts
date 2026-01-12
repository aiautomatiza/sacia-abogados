/**
 * @fileoverview Contact Statuses API Endpoints
 * @description Type-safe wrappers for Contact Statuses API Gateway endpoints
 */

import { apiRequest } from '../client';
import type { ContactStatus, ContactStatusWithUsageCount, ContactStatusFilters } from '@/features/contacts/types';

/**
 * API response for contact statuses list
 */
export interface ContactStatusesResponse {
  data: ContactStatusWithUsageCount[];
}

/**
 * Create Contact Status input (without auto-generated fields)
 */
export interface CreateContactStatusInput {
  name: string;
  color: string;
  icon?: string;
  display_order?: number;
  is_default?: boolean;
}

/**
 * Update Contact Status input (partial)
 */
export interface UpdateContactStatusInput {
  name?: string;
  color?: string;
  icon?: string;
  display_order?: number;
  is_default?: boolean;
  is_active?: boolean;
}

/**
 * Get all contact statuses for current tenant
 *
 * @param filters - Optional filters (is_active, search)
 * @returns Contact statuses with usage count
 *
 * @example
 * const response = await getContactStatuses({ is_active: true });
 * console.log(response.data); // ContactStatusWithUsageCount[]
 */
export async function getContactStatuses(
  filters: ContactStatusFilters = {}
): Promise<ContactStatusesResponse> {
  const params: Record<string, string> = {};

  if (filters.is_active !== undefined) {
    params.is_active = filters.is_active.toString();
  }
  if (filters.search) {
    params.search = filters.search;
  }

  return apiRequest<ContactStatusesResponse>('/api/contact-statuses', {
    method: 'GET',
    params,
  });
}

/**
 * Get single contact status by ID
 *
 * @param id - Status ID
 * @returns Contact status
 *
 * @example
 * const status = await getContactStatus('uuid');
 */
export async function getContactStatus(id: string): Promise<ContactStatus> {
  return apiRequest<ContactStatus>(`/api/contact-statuses/${id}`, {
    method: 'GET',
  });
}

/**
 * Create a new contact status
 * - Validates color format (hex)
 * - Ensures unique name per tenant
 * - Automatically manages default status (only one per tenant)
 *
 * @param status - Status data
 * @returns Created status
 *
 * @example
 * const status = await createContactStatus({
 *   name: 'Cliente VIP',
 *   color: '#8b5cf6',
 *   icon: 'star',
 *   is_default: false
 * });
 */
export async function createContactStatus(
  status: CreateContactStatusInput
): Promise<ContactStatus> {
  return apiRequest<ContactStatus>('/api/contact-statuses', {
    method: 'POST',
    body: status,
  });
}

/**
 * Update an existing contact status
 *
 * @param id - Status ID
 * @param updates - Partial status updates
 * @returns Updated status
 *
 * @example
 * const updated = await updateContactStatus('uuid', {
 *   name: 'Cliente Premium',
 *   color: '#10b981'
 * });
 */
export async function updateContactStatus(
  id: string,
  updates: UpdateContactStatusInput
): Promise<ContactStatus> {
  return apiRequest<ContactStatus>(`/api/contact-statuses/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

/**
 * Delete a contact status (soft delete - sets is_active=false)
 * - Preserves status in history records
 * - Contacts with this status will have status_id set to NULL
 *
 * @param id - Status ID
 * @returns Success response
 *
 * @example
 * await deleteContactStatus('uuid');
 */
export async function deleteContactStatus(
  id: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/contact-statuses/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder contact statuses in bulk
 * - Updates display_order for multiple statuses
 * - Used for drag & drop reordering in UI
 *
 * @param statuses - Array of {id, display_order} to update
 * @returns Success response
 *
 * @example
 * await reorderContactStatuses([
 *   { id: 'uuid1', display_order: 0 },
 *   { id: 'uuid2', display_order: 1 },
 *   { id: 'uuid3', display_order: 2 }
 * ]);
 */
export async function reorderContactStatuses(
  statuses: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/api/contact-statuses/reorder', {
    method: 'POST',
    body: { statuses },
  });
}

/**
 * Update contact's status
 * - Records change in status history
 * - Updates status_updated_at and status_updated_by automatically
 *
 * @param contactId - Contact ID
 * @param statusId - New status ID (null to remove status)
 * @returns Success response
 *
 * @example
 * await updateContactStatusAssignment('contact-uuid', 'status-uuid');
 * // or remove status:
 * await updateContactStatusAssignment('contact-uuid', null);
 */
export async function updateContactStatusAssignment(
  contactId: string,
  statusId: string | null
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/contacts/${contactId}/status`, {
    method: 'PATCH',
    body: { status_id: statusId },
  });
}
