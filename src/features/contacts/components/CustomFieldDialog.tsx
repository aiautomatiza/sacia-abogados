import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useCustomFieldMutations } from '../hooks/useCustomFields';
import type { CustomField } from '../types';

const fieldSchema = z.object({
  field_name: z.string().min(1, 'El identificador es obligatorio').regex(/^[a-z_]+$/, 'Solo minúsculas y guiones bajos'),
  field_label: z.string().min(1, 'El nombre es obligatorio'),
  field_type: z.enum(['text', 'number', 'email', 'phone', 'select', 'date', 'textarea', 'checkbox', 'url']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingField?: CustomField | null;
  tenantId?: string;
}

const generateFieldName = (label: string): string => label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_');

export function CustomFieldDialog({ open, onOpenChange, editingField, tenantId }: CustomFieldDialogProps) {
  const { createField, updateField } = useCustomFieldMutations(tenantId);
  const [newOption, setNewOption] = useState('');
  const [manuallyEditedFieldName, setManuallyEditedFieldName] = useState(false);

  const form = useForm<FieldFormData>({ resolver: zodResolver(fieldSchema), defaultValues: { field_name: '', field_label: '', field_type: 'text', required: false, options: [] } });

  const fieldType = form.watch('field_type');
  const options = form.watch('options') || [];
  const fieldLabel = form.watch('field_label');

  useEffect(() => {
    if (editingField) { form.reset({ field_name: editingField.field_name, field_label: editingField.field_label, field_type: editingField.field_type, required: editingField.required, options: editingField.options || [] }); setManuallyEditedFieldName(true); }
    else { form.reset({ field_name: '', field_label: '', field_type: 'text', required: false, options: [] }); setManuallyEditedFieldName(false); }
  }, [editingField, form]);

  useEffect(() => { if (!editingField && !manuallyEditedFieldName && fieldLabel) form.setValue('field_name', generateFieldName(fieldLabel), { shouldValidate: true }); }, [fieldLabel, editingField, manuallyEditedFieldName, form]);

  const addOption = () => { if (newOption.trim()) { form.setValue('options', [...options, newOption.trim()]); setNewOption(''); } };
  const removeOption = (index: number) => form.setValue('options', options.filter((_, i) => i !== index));

  const onSubmit = async (data: FieldFormData) => {
    const fieldData = { field_name: data.field_name, field_label: data.field_label, field_type: data.field_type, required: data.required, display_order: editingField?.display_order || 0, options: data.field_type === 'select' ? (data.options || []) : [] };
    if (editingField) await updateField.mutateAsync({ id: editingField.id, updates: fieldData }); else await createField.mutateAsync(fieldData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editingField ? 'Editar Campo' : 'Nuevo Campo Personalizado'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="field_label" render={({ field }) => (<FormItem><FormLabel>Nombre del Campo</FormLabel><FormControl><Input placeholder="ej: Empresa" {...field} /></FormControl><FormDescription>Nombre visible</FormDescription><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="field_name" render={({ field }) => (<FormItem><FormLabel>Identificador</FormLabel><FormControl><Input {...field} disabled={!!editingField} placeholder="ej: nombre_empresa" onChange={(e) => { field.onChange(e); setManuallyEditedFieldName(true); }} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="field_type" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="text">Texto</SelectItem><SelectItem value="textarea">Texto Largo</SelectItem><SelectItem value="number">Número</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Teléfono</SelectItem><SelectItem value="url">URL</SelectItem><SelectItem value="date">Fecha</SelectItem><SelectItem value="select">Selección</SelectItem><SelectItem value="checkbox">Casilla</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            {fieldType === 'select' && (<div className="space-y-2"><FormLabel>Opciones</FormLabel><div className="flex gap-2"><Input placeholder="Nueva opción" value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }} /><Button type="button" onClick={addOption} variant="outline">Añadir</Button></div><div className="flex flex-wrap gap-2 mt-2">{options.map((opt, i) => (<Badge key={i} variant="secondary" className="gap-1">{opt}<button type="button" onClick={() => removeOption(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>))}</div></div>)}
            <FormField control={form.control} name="required" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Campo obligatorio</FormLabel></div></FormItem>)} />
            <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={createField.isPending || updateField.isPending}>{editingField ? 'Actualizar' : 'Crear'}</Button></div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
