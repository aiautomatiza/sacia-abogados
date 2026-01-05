import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Contact, CustomField } from '../types';

interface ContactsTableProps {
  contacts: Contact[];
  customFields: CustomField[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactsTable({
  contacts,
  customFields,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
}: ContactsTableProps) {
  const allSelected = contacts.length > 0 && selectedIds.length === contacts.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(contacts.map((c) => c.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const formatValue = (value: any, fieldType?: string) => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (fieldType === 'checkbox') {
      return value ? 'Sí' : 'No';
    }
    
    if (fieldType === 'date') {
      try {
        return format(new Date(value), 'dd/MM/yyyy', { locale: es });
      } catch {
        return value;
      }
    }
    
    return value;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[calc(100vh-20rem)] overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12 bg-muted">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead className="bg-muted">Número</TableHead>
              <TableHead className="bg-muted">Nombre</TableHead>
              {customFields.map((field) => (
                <TableHead key={field.id} className="bg-muted">{field.field_label}</TableHead>
              ))}
              <TableHead className="bg-muted">Fecha Creación</TableHead>
              <TableHead className="text-right bg-muted">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5 + customFields.length} className="text-center text-muted-foreground py-8">
                  No hay contactos. Crea uno nuevo o importa desde CSV.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(contact.id)}
                      onCheckedChange={() => handleSelectOne(contact.id)}
                      aria-label={`Seleccionar ${contact.numero}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{contact.numero}</TableCell>
                  <TableCell>{contact.nombre || '-'}</TableCell>
                  {customFields.map((field) => (
                    <TableCell key={field.id}>
                      {formatValue(contact.attributes[field.field_name], field.field_type)}
                    </TableCell>
                  ))}
                  <TableCell>
                    {format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(contact)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
