import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function ContactSettings() {
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/contacts">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver a Contactos
          </Button>
        </Link>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuración de Campos</h1>
            <p className="text-muted-foreground mt-1">Define los campos personalizados para tus contactos</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Campo
          </Button>
        </div>
      </div>

      {/* Status Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Estados de Contactos
          </CardTitle>
          <CardDescription>
            Configura los estados personalizados para clasificar tus contactos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/contacts/settings/statuses">
            <Button variant="outline">
              Gestionar Estados
            </Button>
          </Link>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <CustomFieldsList fields={customFields} onEdit={handleEdit} onDelete={handleDelete} />
      )}

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
