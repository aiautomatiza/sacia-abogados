/**
 * @fileoverview Calls URL State Hook
 * @description Manages URL params for calls module: callId, tab, page
 */

import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type CallDetailTab = "summary" | "transcript" | "audio";

interface UseCallsUrlStateReturn {
  /** Selected call ID from URL */
  selectedCallId: string | null;
  /** Active tab in call detail modal */
  activeTab: CallDetailTab;
  /** Current page from URL */
  urlPage: number;
  /** Set the selected call ID (updates URL) */
  setSelectedCallId: (callId: string | null) => void;
  /** Set the active tab (updates URL) */
  setActiveTab: (tab: CallDetailTab) => void;
  /** Set the page (updates URL) */
  setUrlPage: (page: number) => void;
  /** Clear all URL params */
  clearUrlState: () => void;
}

const VALID_TABS: CallDetailTab[] = ["summary", "transcript", "audio"];
const DEFAULT_TAB: CallDetailTab = "summary";

export function useCallsUrlState(): UseCallsUrlStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read values from URL
  const selectedCallId = searchParams.get("callId");
  
  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab") as CallDetailTab | null;
    return tab && VALID_TABS.includes(tab) ? tab : DEFAULT_TAB;
  }, [searchParams]);

  const urlPage = useMemo(() => {
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    return isNaN(page) || page < 1 ? 1 : page;
  }, [searchParams]);

  // Setters that update URL
  const setSelectedCallId = useCallback(
    (callId: string | null) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (callId) {
          newParams.set("callId", callId);
        } else {
          newParams.delete("callId");
          newParams.delete("tab"); // Clear tab when closing modal
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  const setActiveTab = useCallback(
    (tab: CallDetailTab) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (tab === DEFAULT_TAB) {
          newParams.delete("tab");
        } else {
          newParams.set("tab", tab);
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  const setUrlPage = useCallback(
    (page: number) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (page === 1) {
          newParams.delete("page");
        } else {
          newParams.set("page", page.toString());
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  const clearUrlState = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    selectedCallId,
    activeTab,
    urlPage,
    setSelectedCallId,
    setActiveTab,
    setUrlPage,
    clearUrlState,
  };
}
