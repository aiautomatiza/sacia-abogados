/**
 * @fileoverview Custom Fields Tab Component
 * @description Tab content for managing custom fields in contact settings
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  useCustomFields,
  useCustomFieldMutations,
  CustomFieldsList,
  CustomFieldDialog,
  type CustomField,
} from '@/features/contacts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * CustomFieldsTab - Manages custom field configuration
 *
 * Features:
 * - List all custom fields
 * - Create new custom fields
 * - Edit existing custom fields
 * - Delete custom fields with confirmation
 */
export function CustomFieldsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);

  const { data: customFields = [], isLoading } = useCustomFields();
  const { deleteField } = useCustomFieldMutations();

  const handleEdit = (field: CustomField) => {
    setSelectedField(field);
    setDialogOpen(true);
  };

  const handleDelete = (field: CustomField) => {
    setSelectedField(field);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedField) {
      await deleteField.mutateAsync(selectedField.id);
      setSelectedField(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedField(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campos Personalizados</h2>
          <p className="text-muted-foreground mt-1">
            Define los campos personalizados para tus contactos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Campo
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <CustomFieldsList fields={customFields} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {/* Dialogs */}
      <CustomFieldDialog open={dialogOpen} onOpenChange={handleDialogClose} editingField={selectedField} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campo personalizado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el campo "{selectedField?.field_label}" de todos los contactos existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
