import { useState, useEffect } from "react";
import type { ConversationFilters } from "../types";

const STORAGE_KEY = "conversations-filters";

export function useConversationsFilters() {
  const [filters, setFilters] = useState<ConversationFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading conversation filters:", error);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error("Error saving conversation filters:", error);
    }
  }, [filters]);

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filters,
    setFilters,
    clearFilters,
  };
}
