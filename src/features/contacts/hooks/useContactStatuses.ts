/**
 * @fileoverview Contact Statuses Hooks
 * @description React Query hooks for fetching contact statuses
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import * as statusApi from '@/lib/api/endpoints/contact-statuses.api';
import * as statusService from '../services/contact-status.service';
import type { ContactStatusFilters } from '../types';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

/**
 * Fetch all contact statuses for current tenant
 *
 * @param filters - Optional filters (is_active, search)
 * @returns Query result with statuses and usage counts
 *
 * @example
 * const { data: statuses, isLoading } = useContactStatuses({ is_active: true });
 */
export function useContactStatuses(filters: ContactStatusFilters = {}) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ['contact-statuses', scope?.tenantId, filters],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway (production)
        const response = await statusApi.getContactStatuses(filters);
        return response.data;
      } else {
        // OLD: Direct Supabase (development)
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return statusService.getContactStatuses(scope.tenantId, filters);
      }
    },
    enabled: USE_API_GATEWAY ? true : !!scope?.tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes (statuses change infrequently)
  });
}

/**
 * Fetch single contact status by ID
 *
 * @param id - Status ID
 * @returns Query result with status details
 *
 * @example
 * const { data: status } = useContactStatus('uuid');
 */
export function useContactStatus(id: string) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ['contact-status', scope?.tenantId, id],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return statusApi.getContactStatus(id);
      } else {
        // OLD: Direct Supabase
        if (!scope?.tenantId) throw new Error('Tenant ID not available');
        return statusService.getContactStatus(id, scope.tenantId);
      }
    },
    enabled: !!id && (USE_API_GATEWAY ? true : !!scope?.tenantId),
  });
}

/**
 * Fetch only active contact statuses (for dropdowns/selects)
 *
 * @returns Query result with active statuses only
 *
 * @example
 * const { data: activeStatuses } = useActiveContactStatuses();
 */
export function useActiveContactStatuses() {
  return useContactStatuses({ is_active: true });
}
