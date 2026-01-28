/**
 * @fileoverview Contact Selector Filters Component
 */

import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/features/contacts/components/StatusFilter';
import type { ContactFilters } from '@/features/contacts';

interface ContactSelectorFiltersProps {
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
}

export function ContactSelectorFilters({
  filters,
  onFiltersChange,
}: ContactSelectorFiltersProps) {
  const hasFilters = filters.search || (filters.status_ids && filters.status_ids.length > 0);

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleStatusChange = (status_ids: string[]) => {
    onFiltersChange({ ...filters, status_ids });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por numero o nombre..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <StatusFilter
        value={filters.status_ids || []}
        onChange={handleStatusChange}
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
