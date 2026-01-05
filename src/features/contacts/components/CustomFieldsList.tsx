import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import type { CustomField } from '../types';

interface CustomFieldsListProps {
  fields: CustomField[];
  onEdit: (field: CustomField) => void;
  onDelete: (field: CustomField) => void;
}

const fieldTypeLabels: Record<string, string> = {
  text: 'Texto', textarea: 'Texto Largo', number: 'Número', email: 'Email',
  phone: 'Teléfono', url: 'URL', date: 'Fecha', select: 'Selección', checkbox: 'Casilla',
};

export function CustomFieldsList({ fields, onEdit, onDelete }: CustomFieldsListProps) {
  if (fields.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No hay campos personalizados.</CardContent></Card>;
  }

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <Card key={field.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{field.field_label}</span>
                {field.required && <Badge variant="destructive" className="text-xs">Obligatorio</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{field.field_name}</span><span>•</span>
                <Badge variant="outline">{fieldTypeLabels[field.field_type]}</Badge>
                {field.field_type === 'select' && field.options.length > 0 && <><span>•</span><span>{field.options.length} opciones</span></>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(field)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(field)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
