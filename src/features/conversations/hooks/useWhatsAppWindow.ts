import { useMemo, useState, useEffect } from "react";
import type { WhatsAppWindow } from "../types";

export function useWhatsAppWindow(expiresAt: string | null): WhatsAppWindow {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const remaining = useMemo(() => {
    if (!expiresAt) return null;

    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, total: diff };
  }, [expiresAt]);

  return {
    hasWindow: !!remaining,
    hoursRemaining: remaining?.hours || 0,
    minutesRemaining: remaining?.minutes || 0,
    totalMs: remaining?.total || 0,
    isExpired: !remaining,
  };
}
