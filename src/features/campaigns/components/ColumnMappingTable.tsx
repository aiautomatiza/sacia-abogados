import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import type { ColumnMapping } from '../types';
import type { CustomField } from '@/features/contacts';

interface ColumnMappingTableProps {
  columns: string[];
  mapping: ColumnMapping;
  onMappingChange: (column: string, value: string) => void;
  customFields?: CustomField[];
  requiredFields?: CustomField[];
}

export function ColumnMappingTable({ 
  columns, 
  mapping, 
  onMappingChange,
  customFields = [],
  requiredFields = []
}: ColumnMappingTableProps) {
  
  const isRequiredFieldMapped = (fieldName: string) => {
    return Object.entries(mapping).some(
      ([col, val]) => val === `custom:${fieldName}`
    );
  };

  const unmappedRequiredFields = requiredFields.filter(
    f => !isRequiredFieldMapped(f.field_name)
  );

  return (
    <div className="space-y-4">
      {requiredFields.length > 0 && (
        <Alert variant={unmappedRequiredFields.length > 0 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Campos obligatorios</AlertTitle>
          <AlertDescription>
            {unmappedRequiredFields.length > 0 ? (
              <>
                Debe mapear estos campos: {unmappedRequiredFields.map(f => f.field_label).join(', ')}
              </>
            ) : (
              'Todos los campos obligatorios están mapeados ✓'
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Columna CSV</TableHead>
                <TableHead>Mapear a</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => {
                const isRequired = requiredFields.some(
                  f => mapping[column] === `custom:${f.field_name}`
                );

                return (
                  <TableRow key={column}>
                    <TableCell className="font-medium">{column}</TableCell>
                    <TableCell>
                      <Select
                        value={mapping[column]}
                        onValueChange={(value) => onMappingChange(column, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="numero">📞 Número (teléfono)</SelectItem>
                          <SelectItem value="nombre">👤 Nombre</SelectItem>

                          {customFields.length > 0 && <Separator className="my-1" />}

                          {customFields.map(field => (
                            <SelectItem
                              key={field.id}
                              value={`custom:${field.field_name}`}
                            >
                              {field.required && '⚠️ '}
                              {field.field_label}
                              {field.required && ' (Obligatorio)'}
                            </SelectItem>
                          ))}

                          <SelectItem value="custom">
                            ➕ Otro atributo: {column}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Requerido
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
