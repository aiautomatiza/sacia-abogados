/**
 * @fileoverview Conversations URL State Hook
 * @description Manages URL params for conversations module: conversationId
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

interface UseConversationsUrlStateReturn {
  /** Current conversation ID from URL */
  urlConversationId: string | null;
  /** Set the conversation ID (updates URL) */
  setUrlConversationId: (id: string | null) => void;
  /** Clear all URL params */
  clearUrlState: () => void;
}

export function useConversationsUrlState(): UseConversationsUrlStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read conversationId from URL
  const urlConversationId = useMemo(() => {
    return searchParams.get("id") || null;
  }, [searchParams]);

  // Setter for conversationId (removes param if null)
  const setUrlConversationId = useCallback(
    (id: string | null) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (id === null) {
          newParams.delete("id");
        } else {
          newParams.set("id", id);
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
    urlConversationId,
    setUrlConversationId,
    clearUrlState,
  };
}
