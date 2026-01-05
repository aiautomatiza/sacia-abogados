import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCustomFields } from '../hooks/useCustomFields';
import { useContactMutations } from '../hooks/useContacts';
import { buildContactSchema } from '../lib/validations';
import { DynamicFieldInput } from './DynamicFieldInput';
import type { Contact } from '../types';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

export function ContactDialog({ open, onOpenChange, contact }: ContactDialogProps) {
  const { data: customFields = [] } = useCustomFields();
  const { createContact, updateContact } = useContactMutations();

  const schema = buildContactSchema(customFields);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      numero: '',
      nombre: '',
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        numero: contact.numero,
        nombre: contact.nombre || '',
        ...contact.attributes,
      });
    } else {
      form.reset({
        numero: '',
        nombre: '',
      });
    }
  }, [contact, form]);

  const onSubmit = async (data: any) => {
    try {
      if (contact) {
        await updateContact.mutateAsync({ id: contact.id, data });
      } else {
        await createContact.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Número <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el número" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customFields.map((customField) => (
              <FormField
                key={customField.id}
                control={form.control}
                name={customField.field_name as any}
                render={({ field }) => (
                  <DynamicFieldInput field={customField} formField={field} />
                )}
              />
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
                {contact ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
