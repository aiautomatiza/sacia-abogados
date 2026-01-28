/**
 * @fileoverview Realtime Campaigns Hook
 * @description Subscribes to campaign changes for real-time updates on the campaigns list
 */

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/use-profile';
import { useRealtime, type RealtimeSubscription, type RealtimePayload } from '@/hooks/use-realtime';
import type { Campaign } from '../types';

interface UseRealtimeCampaignsOptions {
  /** Debounce time in milliseconds (default: 1000) */
  debounceMs?: number;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
}

interface UseRealtimeCampaignsReturn {
  /** Whether the channel is connected */
  isConnected: boolean;
  /** Current connection status */
  connectionStatus: 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useRealtimeCampaigns({
  debounceMs = 1000,
  enabled = true,
}: UseRealtimeCampaignsOptions = {}): UseRealtimeCampaignsReturn {
  const { tenantId, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();

  // Handler for campaign changes - granular cache updates
  const handleCampaignChange = useMemo(() => {
    return (payload: RealtimePayload<Campaign>) => {
      console.log(`[RealtimeCampaigns] ${payload.eventType}:`, payload);

      const { eventType, new: newRecord, old: oldRecord } = payload;

      // For INSERT: Invalidate list to show new campaign
      if (eventType === 'INSERT') {
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        return;
      }

      // For UPDATE: Update campaign in cache if possible
      if (eventType === 'UPDATE' && newRecord) {
        // Update in list queries
        queryClient.setQueriesData<{ data: Campaign[]; total: number }>(
          { queryKey: ['campaigns'], exact: false },
          (oldData) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: oldData.data.map((campaign) =>
                campaign.id === newRecord.id ? { ...campaign, ...newRecord } : campaign
              ),
            };
          }
        );

        // Update single campaign query if it exists
        queryClient.setQueryData(['campaign', newRecord.id], (oldData: Campaign | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, ...newRecord };
        });
      }

      // For DELETE: Remove from cache
      if (eventType === 'DELETE' && oldRecord) {
        queryClient.setQueriesData<{ data: Campaign[]; total: number }>(
          { queryKey: ['campaigns'], exact: false },
          (oldData) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: oldData.data.filter((campaign) => campaign.id !== oldRecord.id),
              total: oldData.total - 1,
            };
          }
        );

        // Remove single campaign query
        queryClient.removeQueries({ queryKey: ['campaign', oldRecord.id] });
      }
    };
  }, [queryClient]);

  // Build subscriptions
  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!tenantId) return [];

    return [
      {
        table: 'campaigns',
        event: '*',
        filter: `tenant_id=eq.${tenantId}`,
        queryKeysToInvalidate: [], // Using onPayload for granular updates
        onPayload: handleCampaignChange as (payload: RealtimePayload) => void,
      },
    ];
  }, [tenantId, handleCampaignChange]);

  const { isConnected, connectionStatus } = useRealtime({
    subscriptions,
    debounceMs,
    enabled: enabled && !!tenantId && !isProfileLoading,
    channelName: tenantId ? `campaigns-list-${tenantId}` : undefined,
  });

  return {
    isConnected,
    connectionStatus,
  };
}
