import { useMemo, useRef, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useRealtime, type RealtimeSubscription } from "@/hooks/use-realtime";
import {
  APPOINTMENTS_QUERY_KEY,
  APPOINTMENTS_STATS_QUERY_KEY,
} from "./use-appointments-data";

// ============================================================================
// Hook: useRealtimeAppointments
// ============================================================================

interface UseRealtimeAppointmentsOptions {
  debounceMs?: number;
  enabled?: boolean;
  onInsert?: (payload: unknown) => void;
  onUpdate?: (payload: unknown) => void;
  onDelete?: (payload: unknown) => void;
}

export function useRealtimeAppointments({
  debounceMs = 1000,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeAppointmentsOptions = {}) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  // Usar refs para las funciones callback para evitar reconexiones innecesarias
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  // Actualizar refs cuando cambien las funciones
  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
  }, [onInsert, onUpdate, onDelete]);

  const subscriptions = useMemo<RealtimeSubscription[]>(() => {
    if (!tenantId) return [];

    return [
      {
        table: "appointments",
        event: "*",
        filter: `tenant_id=eq.${tenantId}`,
        queryKeysToInvalidate: [
          [APPOINTMENTS_QUERY_KEY],
          [APPOINTMENTS_STATS_QUERY_KEY],
        ],
        onPayload: (payload) => {
          console.log(`[RealtimeAppointments] ${payload.eventType}`, payload.new);

          // Callbacks especificos por tipo de evento
          switch (payload.eventType) {
            case "INSERT":
              onInsertRef.current?.(payload.new);
              break;
            case "UPDATE":
              onUpdateRef.current?.(payload.new);
              break;
            case "DELETE":
              onDeleteRef.current?.(payload.old);
              break;
          }
        },
      },
    ];
  }, [tenantId]);

  return useRealtime({
    subscriptions,
    debounceMs,
    enabled: enabled && !!tenantId,
  });
}
