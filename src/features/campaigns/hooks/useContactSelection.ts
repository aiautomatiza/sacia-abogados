/**
 * @fileoverview Contact Selection Hook for Campaign Creation
 * @description Manages multi-page contact selection state for CRM-based campaigns
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import type { Contact, ContactFilters } from '@/features/contacts';

export interface UseContactSelectionOptions {
  pageSize?: number;
}

export interface ContactSelectionSummary {
  mode: 'manual' | 'all_filtered';
  selectedCount: number;
  selectedIds: string[];
  excludedIds: string[];
}

const DEFAULT_PAGE_SIZE = 30;

export function useContactSelection(options: UseContactSelectionOptions = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const { scope } = useAuth();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Filter and pagination state
  const [filters, setFilters] = useState<ContactFilters>({});
  const [page, setPage] = useState(1);

  // Fetch contacts for current page
  const {
    data: contactsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['campaign-contacts-selection', scope?.tenantId, filters, page, pageSize],
    queryFn: async () => {
      if (!scope?.tenantId) {
        return { data: [], total: 0 };
      }

      let query = supabase
        .from('crm_contacts')
        .select('id, numero, nombre, attributes, status_id, created_at', { count: 'exact' })
        .eq('tenant_id', scope.tenantId)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `numero.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`
        );
      }

      // Apply status filter
      if (filters.status_ids && filters.status_ids.length > 0) {
        query = query.in('status_id', filters.status_ids);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        data: (data || []) as Contact[],
        total: count || 0,
      };
    },
    enabled: !!scope?.tenantId,
    staleTime: 1000 * 30, // 30 seconds
  });

  const contacts = useMemo(() => contactsData?.data || [], [contactsData?.data]);
  const totalContacts = contactsData?.total || 0;
  const totalPages = Math.ceil(totalContacts / pageSize);

  // Check if a contact is selected
  const isSelected = useCallback(
    (contactId: string) => {
      if (selectAllFiltered) {
        return !excludedIds.has(contactId);
      }
      return selectedIds.has(contactId);
    },
    [selectAllFiltered, excludedIds, selectedIds]
  );

  // Toggle individual contact selection
  const toggleContact = useCallback(
    (contactId: string) => {
      if (selectAllFiltered) {
        // In "select all" mode, toggle means add/remove from excluded
        setExcludedIds((prev) => {
          const next = new Set(prev);
          if (next.has(contactId)) {
            next.delete(contactId);
          } else {
            next.add(contactId);
          }
          return next;
        });
      } else {
        // In manual mode, toggle means add/remove from selected
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(contactId)) {
            next.delete(contactId);
          } else {
            next.add(contactId);
          }
          return next;
        });
      }
    },
    [selectAllFiltered]
  );

  // Select all contacts on current page
  const selectPage = useCallback(() => {
    if (selectAllFiltered) {
      // Remove current page contacts from excluded
      setExcludedIds((prev) => {
        const next = new Set(prev);
        contacts.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      // Add current page contacts to selected
      setSelectedIds((prev) => {
        const next = new Set(prev);
        contacts.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }, [selectAllFiltered, contacts]);

  // Deselect all contacts on current page
  const deselectPage = useCallback(() => {
    if (selectAllFiltered) {
      // Add current page contacts to excluded
      setExcludedIds((prev) => {
        const next = new Set(prev);
        contacts.forEach((c) => next.add(c.id));
        return next;
      });
    } else {
      // Remove current page contacts from selected
      setSelectedIds((prev) => {
        const next = new Set(prev);
        contacts.forEach((c) => next.delete(c.id));
        return next;
      });
    }
  }, [selectAllFiltered, contacts]);

  // Check if all contacts on current page are selected
  const isPageSelected = useMemo(() => {
    if (contacts.length === 0) return false;
    return contacts.every((c) => isSelected(c.id));
  }, [contacts, isSelected]);

  // Check if some (but not all) contacts on current page are selected
  const isPageIndeterminate = useMemo(() => {
    if (contacts.length === 0) return false;
    const selectedCount = contacts.filter((c) => isSelected(c.id)).length;
    return selectedCount > 0 && selectedCount < contacts.length;
  }, [contacts, isSelected]);

  // Toggle page selection
  const togglePage = useCallback(() => {
    if (isPageSelected) {
      deselectPage();
    } else {
      selectPage();
    }
  }, [isPageSelected, selectPage, deselectPage]);

  // Select all filtered contacts
  const selectAllFilteredContacts = useCallback(() => {
    setSelectAllFiltered(true);
    setExcludedIds(new Set());
    setSelectedIds(new Set());
  }, []);

  // Clear all selection
  const clearSelection = useCallback(() => {
    setSelectAllFiltered(false);
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }, []);

  // Calculate selected count
  const selectedCount = useMemo(() => {
    if (selectAllFiltered) {
      return totalContacts - excludedIds.size;
    }
    return selectedIds.size;
  }, [selectAllFiltered, totalContacts, excludedIds, selectedIds]);

  // Get selection summary for campaign creation
  const getSelectionSummary = useCallback((): ContactSelectionSummary => {
    return {
      mode: selectAllFiltered ? 'all_filtered' : 'manual',
      selectedCount,
      selectedIds: Array.from(selectedIds),
      excludedIds: Array.from(excludedIds),
    };
  }, [selectAllFiltered, selectedCount, selectedIds, excludedIds]);

  // Get all selected contact IDs (for campaign launch)
  const getSelectedContactIds = useCallback(async (): Promise<string[]> => {
    if (!selectAllFiltered) {
      return Array.from(selectedIds);
    }

    // Fetch all IDs matching filters, excluding excluded ones
    if (!scope?.tenantId) return [];

    let query = supabase
      .from('crm_contacts')
      .select('id')
      .eq('tenant_id', scope.tenantId);

    // Apply filters
    if (filters.search) {
      query = query.or(
        `numero.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`
      );
    }

    if (filters.status_ids && filters.status_ids.length > 0) {
      query = query.in('status_id', filters.status_ids);
    }

    const { data, error } = await query;

    if (error) throw error;

    const allIds = (data || []).map((c) => c.id);
    return allIds.filter((id) => !excludedIds.has(id));
  }, [selectAllFiltered, selectedIds, excludedIds, filters, scope?.tenantId]);

  // Update filters and reset pagination
  const updateFilters = useCallback((newFilters: ContactFilters) => {
    setFilters(newFilters);
    setPage(1);
    // Clear selection when filters change
    clearSelection();
  }, [clearSelection]);

  // Pagination helpers
  const goToPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
      setPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  return {
    // Data
    contacts,
    totalContacts,
    totalPages,
    isLoading,
    isFetching,

    // Selection state
    selectedCount,
    selectAllFiltered,
    isSelected,
    isPageSelected,
    isPageIndeterminate,

    // Selection actions
    toggleContact,
    togglePage,
    selectPage,
    deselectPage,
    selectAllFilteredContacts,
    clearSelection,

    // Selection retrieval
    getSelectionSummary,
    getSelectedContactIds,

    // Filters
    filters,
    updateFilters,

    // Pagination
    page,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    canGoNext: page < totalPages,
    canGoPrev: page > 1,
  };
}
