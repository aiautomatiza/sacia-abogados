/**
 * @fileoverview Generic Realtime Hook
 * @description Reusable hook for Supabase realtime subscriptions with debouncing
 * @see src/features/conversations/hooks/useRealtimeConversations.ts for reference
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type ConnectionStatus = "initializing" | "connecting" | "connected" | "disconnected" | "error";

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
  table: string;
  schema: string;
}

export interface RealtimeSubscription {
  /** Table name to subscribe to */
  table: string;
  /** Schema name (default: 'public') */
  schema?: string;
  /** Event type to listen for (default: '*') */
  event?: RealtimeEvent;
  /** Postgres filter expression (e.g., 'tenant_id=eq.xxx') */
  filter?: string;
  /** Query keys to invalidate when changes occur */
  queryKeysToInvalidate?: unknown[][];
  /** Custom callback for handling payloads */
  onPayload?: (payload: RealtimePayload) => void;
}

export interface UseRealtimeOptions {
  /** Array of table subscriptions */
  subscriptions: RealtimeSubscription[];
  /** Debounce time in milliseconds (default: 1000) */
  debounceMs?: number;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
  /** Custom channel name (auto-generated if not provided) */
  channelName?: string;
}

export interface UseRealtimeReturn {
  /** Whether the channel is connected */
  isConnected: boolean;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
}

// ============================================================================
// Hook Implementation
// ============================================================================

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

export function useRealtime({
  subscriptions,
  debounceMs = 1000,
  enabled = true,
  channelName,
}: UseRealtimeOptions): UseRealtimeReturn {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initial state: "initializing" if enabled but no subscriptions yet
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    enabled && subscriptions.length === 0 ? "initializing" : "disconnected"
  );

  // Update state when conditions change
  useEffect(() => {
    if (!enabled) {
      setConnectionStatus("disconnected");
    } else if (subscriptions.length === 0) {
      setConnectionStatus("initializing");
    }
  }, [enabled, subscriptions.length]);

  // Debounced invalidation to prevent excessive query refreshes
  const debouncedInvalidate = useCallback(
    (queryKeys: unknown[][]) => {
      queryKeys.forEach((queryKey) => {
        const key = JSON.stringify(queryKey);

        // Clear existing timer for this key
        const existingTimer = debounceTimersRef.current.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey, exact: false });
          debounceTimersRef.current.delete(key);
        }, debounceMs);

        debounceTimersRef.current.set(key, timer);
      });
    },
    [queryClient, debounceMs]
  );

  useEffect(() => {
    // Don't subscribe if disabled or no subscriptions
    if (!enabled || subscriptions.length === 0) {
      return;
    }

    let retryCount = 0;
    let retryTimer: NodeJS.Timeout | null = null;
    let isCleaned = false;
    let activeChannel: RealtimeChannel | null = null;

    /**
     * Creates a Supabase Realtime channel and subscribes to postgres_changes.
     * Self-retries on TIMED_OUT or CHANNEL_ERROR up to MAX_RETRIES times.
     */
    const setupChannel = () => {
      if (isCleaned) return;

      // Unique name per attempt to avoid Supabase channel name conflicts
      const suffix = retryCount > 0 ? `-r${retryCount}` : "";
      const name =
        (channelName || `realtime-${subscriptions.map((s) => s.table).join("-")}`) + suffix;

      console.log(
        "[Realtime] Setting up channel:",
        name,
        retryCount > 0 ? `(retry ${retryCount}/${MAX_RETRIES})` : ""
      );
      setConnectionStatus("connecting");

      // Create channel
      const channel = supabase.channel(name);

      // Add subscriptions for each table
      subscriptions.forEach((subscription) => {
        const {
          table,
          schema = "public",
          event = "*",
          filter,
          queryKeysToInvalidate = [],
          onPayload,
        } = subscription;

        // Handler function for the subscription
        const handleChange = (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => {
          console.log(`[Realtime] ${table} changed:`, payload.eventType);

          // Create typed payload
          const typedPayload: RealtimePayload = {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table,
            schema,
          };

          // Call custom handler if provided
          if (onPayload) {
            onPayload(typedPayload);
          }

          // Invalidate specified query keys
          if (queryKeysToInvalidate.length > 0) {
            debouncedInvalidate(queryKeysToInvalidate);
          }
        };

        // Subscribe with or without filter - using type assertion for Supabase overloads
        if (filter) {
          channel.on(
            "postgres_changes",
            { event, schema, table, filter } as any,
            handleChange
          );
        } else {
          channel.on(
            "postgres_changes",
            { event, schema, table } as any,
            handleChange
          );
        }
      });

      // Subscribe to the channel with retry logic for TIMED_OUT
      channel.subscribe((status) => {
        if (isCleaned) return;

        console.log("[Realtime] Channel status:", status);

        switch (status) {
          case "SUBSCRIBED":
            setConnectionStatus("connected");
            retryCount = 0; // Reset on success
            break;
          case "TIMED_OUT":
          case "CHANNEL_ERROR":
            console.warn(`[Realtime] Channel ${status}`);
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              supabase.removeChannel(channel);
              if (activeChannel === channel) {
                activeChannel = null;
                channelRef.current = null;
              }
              const delay = BASE_RETRY_DELAY_MS * retryCount;
              console.log(`[Realtime] Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
              retryTimer = setTimeout(setupChannel, delay);
            } else {
              setConnectionStatus("error");
            }
            break;
          case "CLOSED":
            setConnectionStatus("disconnected");
            break;
          default:
            setConnectionStatus("connecting");
        }
      });

      activeChannel = channel;
      channelRef.current = channel;
    };

    setupChannel();

    // Cleanup function
    return () => {
      isCleaned = true;
      console.log("[Realtime] Cleaning up channel");

      // Clear retry timer
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      // Clear all debounce timers
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
      debounceTimersRef.current.clear();

      // Remove channel
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
      channelRef.current = null;

      setConnectionStatus("disconnected");
    };
  }, [enabled, subscriptions, channelName, debouncedInvalidate]);

  return {
    isConnected: connectionStatus === "connected",
    connectionStatus,
  };
}
