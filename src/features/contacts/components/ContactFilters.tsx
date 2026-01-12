import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { StatusFilter } from './StatusFilter';

interface ContactFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  statusIds: string[];
  onStatusIdsChange: (statusIds: string[]) => void;
}

export function ContactFilters({ search, onSearchChange, statusIds, onStatusIdsChange }: ContactFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número o nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <StatusFilter value={statusIds} onChange={onStatusIdsChange} />
    </div>
  );
}
