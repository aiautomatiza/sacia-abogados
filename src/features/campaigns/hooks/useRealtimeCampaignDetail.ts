/**
 * @fileoverview Realtime Campaign Detail Hook
 * @description Subscribes to campaign and batch changes for real-time updates on campaign detail page
 */

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { useRealtime, type RealtimeSubscription, type RealtimePayload } from '@/hooks/use-realtime';
import type { Campaign, CampaignBatch } from '../types';

interface UseRealtimeCampaignDetailOptions {
  /** Campaign ID to subscribe to */
  campaignId: string | undefined;
  /** Debounce time in milliseconds (default: 500 for faster updates) */
  debounceMs?: number;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
}

interface UseRealtimeCampaignDetailReturn {
  /** Whether the channel is connected */
  isConnected: boolean;
  /** Current connection status */
  connectionStatus: 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useRealtimeCampaignDetail({
  campaignId,
  debounceMs = 500, // Faster updates for detail view
  enabled = true,
}: UseRealtimeCampaignDetailOptions): UseRealtimeCampaignDetailReturn {
  const { tenantId, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();

  // Handler for campaign changes
  const handleCampaignChange = useMemo(() => {
    return (payload: RealtimePayload<Campaign>) => {
      console.log(`[RealtimeCampaignDetail] Campaign ${payload.eventType}:`, payload);

      const { eventType, new: newRecord } = payload;

      // Only handle updates for the specific campaign
      if (eventType === 'UPDATE' && newRecord && newRecord.id === campaignId) {
        // Update single campaign query
        queryClient.setQueryData(['campaign', campaignId], (oldData: Campaign | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, ...newRecord };
        });

        // Also update in list queries for consistency
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
      }

      // Handle deletion
      if (eventType === 'DELETE') {
        queryClient.removeQueries({ queryKey: ['campaign', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
      }
    };
  }, [queryClient, campaignId]);

  // Handler for batch/queue changes
  const handleBatchChange = useMemo(() => {
    return (payload: RealtimePayload<CampaignBatch & { campaign_id?: string }>) => {
      console.log(`[RealtimeCampaignDetail] Batch ${payload.eventType}:`, payload);

      const { eventType, new: newRecord } = payload;

      // Check if this batch belongs to our campaign
      const batchCampaignId = newRecord?.campaign_id || (payload.old as any)?.campaign_id;
      if (batchCampaignId !== campaignId) return;

      // Invalidate campaign contacts to refresh batch statuses
      if (eventType === 'UPDATE' || eventType === 'INSERT') {
        queryClient.invalidateQueries({ queryKey: ['campaign-contacts', campaignId] });

        // Also refetch the campaign to get updated counters
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      }
    };
  }, [queryClient, campaignId]);

  // Build subscriptions
  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!tenantId || !campaignId) return [];

    return [
      // Subscribe to campaign updates
      {
        table: 'campaigns',
        event: '*',
        filter: `id=eq.${campaignId}`,
        queryKeysToInvalidate: [],
        onPayload: handleCampaignChange as (payload: RealtimePayload) => void,
      },
      // Subscribe to batch/queue updates for this campaign
      {
        table: 'campaign_queue',
        event: '*',
        filter: `campaign_id=eq.${campaignId}`,
        queryKeysToInvalidate: [],
        onPayload: handleBatchChange as (payload: RealtimePayload) => void,
      },
    ];
  }, [tenantId, campaignId, handleCampaignChange, handleBatchChange]);

  const { isConnected, connectionStatus } = useRealtime({
    subscriptions,
    debounceMs,
    enabled: enabled && !!tenantId && !!campaignId && !isProfileLoading,
    channelName: campaignId ? `campaign-detail-${campaignId}` : undefined,
  });

  return {
    isConnected,
    connectionStatus,
  };
}
