/**
 * @fileoverview Contact Status History Hooks
 * @description React Query hooks for fetching contact status change history
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import * as historyApi from '@/lib/api/endpoints/contact-status-history.api';
import * as historyService from '../services/contact-status-history.service';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

/**
 * Fetch status change history for a specific contact
 * - Returns changes in reverse chronological order
 * - Automatically includes status details and user info
 *
 * @param contactId - Contact ID
 * @returns Query result with status history
 *
 * @example
 * const { data: history, isLoading } = useContactStatusHistory('contact-uuid');
 */
export function useContactStatusHistory(contactId: string) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ['contact-status-history', scope?.tenantId, contactId],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const response = await historyApi.getContactStatusHistory(contactId);
        return response.data;
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return historyService.getContactStatusHistory(contactId, scope.tenantId);
      }
    },
    enabled: !!contactId && (USE_API_GATEWAY ? true : !!scope?.tenantId),
  });
}

/**
 * Fetch recent status changes across all contacts
 * - Useful for activity feeds and dashboards
 * - Returns most recent changes first
 *
 * @param limit - Number of changes to fetch (default: 10)
 * @returns Query result with recent status changes
 *
 * @example
 * const { data: recentChanges } = useRecentStatusChanges(20);
 */
export function useRecentStatusChanges(limit: number = 10) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ['recent-status-changes', scope?.tenantId, limit],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const response = await historyApi.getRecentStatusChanges(limit);
        return response.data;
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return historyService.getRecentStatusChanges(scope.tenantId, limit);
      }
    },
    enabled: USE_API_GATEWAY ? true : !!scope?.tenantId,
    refetchInterval: 30000, // Refetch every 30s for live updates
  });
}
