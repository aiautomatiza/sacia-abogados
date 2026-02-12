/**
 * @fileoverview Status Select Component
 * @description Combobox for selecting contact status in forms
 */

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useActiveContactStatuses } from '../hooks/useContactStatuses';
import { StatusBadge } from './StatusBadge';

interface StatusSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

/**
 * StatusSelect - Combobox for selecting contact status
 *
 * @param value - Current status ID (or null)
 * @param onValueChange - Callback when status changes
 * @param placeholder - Placeholder text (default: "Seleccionar estado")
 * @param allowClear - Whether to show "Sin estado" option (default: true)
 * @param disabled - Whether select is disabled
 *
 * @example
 * <StatusSelect
 *   value={form.watch('status_id')}
 *   onValueChange={(val) => form.setValue('status_id', val)}
 * />
 */
export function StatusSelect({
  value,
  onValueChange,
  placeholder = 'Seleccionar estado',
  allowClear = true,
  disabled = false,
}: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: statuses, isLoading } = useActiveContactStatuses();

  const selectedStatus = statuses?.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {selectedStatus ? (
            <StatusBadge status={selectedStatus} className="border-0" />
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar estado..." />
          <CommandList>
          <CommandEmpty>No se encontraron estados.</CommandEmpty>
          <CommandGroup>
            {allowClear && (
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Sin estado
              </CommandItem>
            )}
            {statuses?.map((status) => (
              <CommandItem
                key={status.id}
                value={status.id}
                keywords={[status.name]}
                onSelect={() => {
                  onValueChange(status.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === status.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <StatusBadge status={status} className="border-0" />
              </CommandItem>
            ))}
          </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
