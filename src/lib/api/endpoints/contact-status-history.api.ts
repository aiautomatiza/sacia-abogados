/**
 * @fileoverview Contact Status History API Endpoints
 * @description API endpoints for tracking contact status changes over time
 */

import { apiRequest } from '../client';
import type { ContactStatusHistory } from '@/features/contacts/types';

/**
 * API response for status history
 */
export interface StatusHistoryResponse {
  data: ContactStatusHistory[];
}

/**
 * Get status change history for a specific contact
 * - Returns changes in reverse chronological order (newest first)
 * - Includes status details and user who made the change
 *
 * @param contactId - Contact ID
 * @returns Status change history
 *
 * @example
 * const response = await getContactStatusHistory('contact-uuid');
 * console.log(response.data); // ContactStatusHistory[]
 */
export async function getContactStatusHistory(
  contactId: string
): Promise<StatusHistoryResponse> {
  return apiRequest<StatusHistoryResponse>(
    `/api/contacts/${contactId}/status-history`,
    { method: 'GET' }
  );
}

/**
 * Get recent status changes across all contacts in tenant
 * - Useful for dashboard/activity feed
 * - Returns most recent changes first
 *
 * @param limit - Number of recent changes to fetch (default: 10)
 * @returns Recent status changes
 *
 * @example
 * const response = await getRecentStatusChanges(20);
 * console.log(response.data); // Latest 20 status changes
 */
export async function getRecentStatusChanges(
  limit: number = 10
): Promise<StatusHistoryResponse> {
  return apiRequest<StatusHistoryResponse>('/api/contact-statuses/recent-changes', {
    method: 'GET',
    params: { limit: limit.toString() },
  });
}
