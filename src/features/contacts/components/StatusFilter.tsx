/**
 * @fileoverview Status Filter Component
 * @description Multi-select dropdown filter for contact statuses in tables
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import { useActiveContactStatuses } from '../hooks/useContactStatuses';
import { StatusBadge } from './StatusBadge';

interface StatusFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * StatusFilter - Multi-select dropdown for filtering contacts by status
 *
 * @param value - Array of selected status IDs
 * @param onChange - Callback when selection changes
 *
 * @example
 * const [statusIds, setStatusIds] = useState<string[]>([]);
 * <StatusFilter value={statusIds} onChange={setStatusIds} />
 */
export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const { data: statuses, isLoading } = useActiveContactStatuses();

  const toggleStatus = (statusId: string) => {
    if (value.includes(statusId)) {
      onChange(value.filter(id => id !== statusId));
    } else {
      onChange([...value, statusId]);
    }
  };

  const clearFilters = () => onChange([]);

  const selectedCount = value.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Estado
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground">Cargando...</div>
        ) : statuses && statuses.length > 0 ? (
          <>
            {statuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status.id}
                checked={value.includes(status.id)}
                onCheckedChange={() => toggleStatus(status.id)}
              >
                <StatusBadge status={status} className="border-0" />
              </DropdownMenuCheckboxItem>
            ))}
            {selectedCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="p-2 text-sm text-muted-foreground">
            No hay estados configurados
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
