/**
 * @fileoverview Contact Selector Table Component
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatusBadge } from '@/features/contacts/components/StatusBadge';
import { useActiveContactStatuses } from '@/features/contacts/hooks/useContactStatuses';
import type { Contact } from '@/features/contacts';

interface ContactSelectorTableProps {
  contacts: Contact[];
  isLoading: boolean;
  isSelected: (contactId: string) => boolean;
  isPageSelected: boolean;
  isPageIndeterminate: boolean;
  onToggleContact: (contactId: string) => void;
  onTogglePage: () => void;
}

export function ContactSelectorTable({
  contacts,
  isLoading,
  isSelected,
  isPageSelected,
  isPageIndeterminate,
  onToggleContact,
  onTogglePage,
}: ContactSelectorTableProps) {
  const { data: statuses = [] } = useActiveContactStatuses();

  const getStatus = (statusId: string | null) => {
    if (!statusId) return null;
    return statuses.find((s) => s.id === statusId) || null;
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 bg-muted">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead className="bg-muted">Numero</TableHead>
              <TableHead className="bg-muted">Nombre</TableHead>
              <TableHead className="bg-muted">Estado</TableHead>
              <TableHead className="bg-muted">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12 bg-muted">
                <Checkbox
                  checked={isPageSelected}
                  onCheckedChange={onTogglePage}
                  aria-label="Seleccionar todos en esta pagina"
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement).dataset.state = isPageIndeterminate
                        ? 'indeterminate'
                        : isPageSelected
                        ? 'checked'
                        : 'unchecked';
                    }
                  }}
                />
              </TableHead>
              <TableHead className="bg-muted">Numero</TableHead>
              <TableHead className="bg-muted">Nombre</TableHead>
              <TableHead className="bg-muted">Estado</TableHead>
              <TableHead className="bg-muted">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No se encontraron contactos con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className={isSelected(contact.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected(contact.id)}
                      onCheckedChange={() => onToggleContact(contact.id)}
                      aria-label={`Seleccionar ${contact.numero}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{contact.numero}</TableCell>
                  <TableCell>{contact.nombre || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={getStatus(contact.status_id)} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(contact.created_at), 'dd/MM/yyyy', {
                      locale: es,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
