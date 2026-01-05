/**
 * @fileoverview Contacts URL State Hook
 * @description Manages URL params for contacts module: page, search
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

interface UseContactsUrlStateReturn {
  /** Current page from URL */
  urlPage: number;
  /** Search term from URL */
  urlSearch: string;
  /** Set the page (updates URL) */
  setUrlPage: (page: number) => void;
  /** Set the search term (updates URL) */
  setUrlSearch: (search: string) => void;
  /** Clear all URL params */
  clearUrlState: () => void;
}

export function useContactsUrlState(): UseContactsUrlStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read page from URL (default 1)
  const urlPage = useMemo(() => {
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    return isNaN(page) || page < 1 ? 1 : page;
  }, [searchParams]);

  // Read search from URL (default "")
  const urlSearch = searchParams.get("search") || "";

  // Setter for page (removes param if page is 1)
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

  // Setter for search (removes param if empty, resets page to 1)
  const setUrlSearch = useCallback(
    (search: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (search === "") {
          newParams.delete("search");
        } else {
          newParams.set("search", search);
        }
        // Reset to page 1 when search changes
        newParams.delete("page");
        return newParams;
      });
    },
    [setSearchParams]
  );

  const clearUrlState = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    urlPage,
    urlSearch,
    setUrlPage,
    setUrlSearch,
    clearUrlState,
  };
}
