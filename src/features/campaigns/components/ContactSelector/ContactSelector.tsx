/**
 * @fileoverview Main Contact Selector Component for Campaign Creation
 * @description Allows users to select contacts from CRM for campaigns
 */

import { ContactSelectorFilters } from './ContactSelectorFilters';
import { ContactSelectorTable } from './ContactSelectorTable';
import { ContactSelectorPagination } from './ContactSelectorPagination';
import { SelectedContactsSummary } from './SelectedContactsSummary';
import { useContactSelection } from '../../hooks/useContactSelection';

interface ContactSelectorProps {
  onSelectionChange?: (selectedCount: number) => void;
  selectionRef?: React.MutableRefObject<ReturnType<typeof useContactSelection> | null>;
}

export function ContactSelector({
  onSelectionChange,
  selectionRef,
}: ContactSelectorProps) {
  const selection = useContactSelection({ pageSize: 30 });

  // Expose selection methods to parent
  if (selectionRef) {
    selectionRef.current = selection;
  }

  // Notify parent of selection changes
  if (onSelectionChange) {
    onSelectionChange(selection.selectedCount);
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <SelectedContactsSummary
        selectedCount={selection.selectedCount}
        totalContacts={selection.totalContacts}
        selectAllFiltered={selection.selectAllFiltered}
        onSelectAllFiltered={selection.selectAllFilteredContacts}
        onClearSelection={selection.clearSelection}
      />

      {/* Filters */}
      <ContactSelectorFilters
        filters={selection.filters}
        onFiltersChange={selection.updateFilters}
      />

      {/* Table */}
      <ContactSelectorTable
        contacts={selection.contacts}
        isLoading={selection.isLoading}
        isSelected={selection.isSelected}
        isPageSelected={selection.isPageSelected}
        isPageIndeterminate={selection.isPageIndeterminate}
        onToggleContact={selection.toggleContact}
        onTogglePage={selection.togglePage}
      />

      {/* Pagination */}
      <ContactSelectorPagination
        page={selection.page}
        totalPages={selection.totalPages}
        totalContacts={selection.totalContacts}
        pageSize={selection.pageSize}
        canGoNext={selection.canGoNext}
        canGoPrev={selection.canGoPrev}
        onNextPage={selection.nextPage}
        onPrevPage={selection.prevPage}
      />
    </div>
  );
}
