import { useState } from "react";
import { Plus, Trash2, Edit, Phone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWhatsAppNumbers } from "@/features/conversations/hooks/useWhatsAppNumbers";
import { useWhatsAppNumberMutations } from "@/features/conversations/hooks/useWhatsAppNumberMutations";
import { WhatsAppNumberDialog } from "./WhatsAppNumberDialog";
import type { WhatsAppNumber } from "@/features/conversations/services/whatsapp-number.service";

interface WhatsAppNumbersManagerProps {
  tenantId: string;
}

export function WhatsAppNumbersManager({ tenantId }: WhatsAppNumbersManagerProps) {
  const { data: numbers, isLoading } = useWhatsAppNumbers(tenantId);
  const { deleteMutation } = useWhatsAppNumberMutations(tenantId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState<WhatsAppNumber | null>(null);

  const handleEdit = (number: WhatsAppNumber) => {
    setEditingNumber(number);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingNumber(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (number: WhatsAppNumber) => {
    setNumberToDelete(number);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (numberToDelete) {
      deleteMutation.mutate(numberToDelete.id);
      setDeleteDialogOpen(false);
      setNumberToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingNumber(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Números de WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Números de WhatsApp</CardTitle>
              <CardDescription className="mt-1.5">
                Configura múltiples números de WhatsApp para tu tenant
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Número
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {numbers && numbers.length > 0 ? (
            <div className="space-y-4">
              {numbers.map((number) => (
                <div
                  key={number.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                      <Phone className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">
                          {number.alias}
                        </span>
                        {number.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            Predeterminado
                          </Badge>
                        )}
                        <Badge
                          variant={number.status === "active" ? "default" : "secondary"}
                          className={
                            number.status === "active"
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : ""
                          }
                        >
                          {number.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {number.phone_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Meta ID: <span className="font-mono">{number.phone_number_id}</span>
                        {number.phone_number_id.startsWith('PENDING_') && (
                          <span className="ml-2 text-yellow-600 font-medium">
                            (Pendiente de configuración)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        WABA ID: <span className="font-mono">{number.waba_id || 'No configurado'}</span>
                        {number.waba_id?.startsWith('WABA_PENDING_') && (
                          <span className="ml-2 text-yellow-600 font-medium">
                            (Pendiente de configuración)
                          </span>
                        )}
                      </p>
                      {number.webhook_url && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Webhook: {number.webhook_url}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(number)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(number)}
                      disabled={number.is_default && numbers.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No hay números configurados
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Agrega tu primer número de WhatsApp para comenzar
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Número
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <WhatsAppNumberDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingNumber={editingNumber}
        tenantId={tenantId}
        onSuccess={() => {
          setDialogOpen(false);
          setEditingNumber(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el número de WhatsApp "
              {numberToDelete?.alias}" ({numberToDelete?.phone_number}).
              {numberToDelete?.is_default && (
                <span className="block mt-2 font-semibold text-yellow-600">
                  ⚠️ Este es el número predeterminado. Asegúrate de configurar
                  otro número como predeterminado antes de eliminar este.
                </span>
              )}
              <span className="block mt-2">
                Las conversaciones asociadas a este número seguirán existiendo
                pero sin número asignado.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
