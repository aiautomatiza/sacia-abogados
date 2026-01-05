/**
 * @fileoverview Realtime Calls Hook
 * @description Hook for realtime updates on crm_calls table
 */

import { useMemo } from "react";
import { useRealtime, type RealtimeSubscription } from "@/hooks/use-realtime";
import { useProfile } from "@/hooks/useProfile";
import { CALLS_QUERY_KEY, CALLS_STATS_QUERY_KEY } from "./use-calls-data";

interface UseRealtimeCallsOptions {
  /** Debounce time in milliseconds (default: 1000) */
  debounceMs?: number;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
}

/**
 * Hook for subscribing to realtime updates on calls
 * Automatically invalidates calls and stats queries when changes occur
 */
export function useRealtimeCalls({
  debounceMs = 1000,
  enabled = true,
}: UseRealtimeCallsOptions = {}) {
  const { tenantId, isLoading: isProfileLoading } = useProfile();

  // Memoize subscriptions to prevent unnecessary re-subscriptions
  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!tenantId) return [];

    return [
      {
        table: "crm_calls",
        event: "*",
        queryKeysToInvalidate: [
          [CALLS_QUERY_KEY, tenantId],
          [CALLS_STATS_QUERY_KEY, tenantId],
        ],
        onPayload: (payload) => {
          console.log(`[RealtimeCalls] ${payload.eventType}:`, {
            id: (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id,
          });
        },
      },
    ];
  }, [tenantId]);

  const channelName = tenantId ? `calls-${tenantId}` : undefined;

  const { isConnected, connectionStatus } = useRealtime({
    subscriptions,
    debounceMs,
    enabled: enabled && !!tenantId,
    channelName,
  });

  // Track if we're waiting for dependencies (profile loading or no tenantId yet)
  const isInitializing = isProfileLoading || (!tenantId && enabled);

  return {
    isConnected,
    connectionStatus,
    isInitializing,
  };
}
