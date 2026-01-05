import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import {
  useCustomFields,
  useCustomFieldMutations,
  CustomFieldsList,
  CustomFieldDialog,
  type CustomField,
} from '@/features/contacts';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TenantCustomFields() {
  const { id: tenantId } = useParams();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);

  const { data: customFields = [], isLoading } = useCustomFields(tenantId);
  const { deleteField } = useCustomFieldMutations(tenantId);

  const handleEdit = (field: CustomField) => { setSelectedField(field); setDialogOpen(true); };
  const handleDelete = (field: CustomField) => { setSelectedField(field); setDeleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (selectedField) {
      await deleteField.mutateAsync(selectedField.id);
      setSelectedField(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campos Personalizados</h1>
          <p className="text-muted-foreground mt-1">Gestiona los campos personalizados de este cliente</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nuevo Campo</Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
      ) : (
        <ScrollArea className="h-[calc(100vh-260px)]"><div className="pr-4"><CustomFieldsList fields={customFields} onEdit={handleEdit} onDelete={handleDelete} /></div></ScrollArea>
      )}
      <CustomFieldDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelectedField(null); }} editingField={selectedField} tenantId={tenantId} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar campo personalizado?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
