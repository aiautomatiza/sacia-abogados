import { useState } from "react";
import {
  Phone,
  MapPin,
  User,
  Clock,
  Calendar,
  FileText,
  MessageSquare,
  X,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AppointmentDetailed, AppointmentStatus } from "../types";
import { AppointmentTypeBadge } from "./AppointmentTypeBadge";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import {
  formatAppointmentDateFull,
  formatDuration,
  formatContactDisplay,
  formatAssignment,
  formatLocationAddress,
  formatRelativeTime,
} from "../utils/appointment-formatters";
import { useAppointmentMutations } from "../hooks/use-appointment-mutations";

interface AppointmentDetailModalProps {
  appointment: AppointmentDetailed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (appointment: AppointmentDetailed) => void;
}

export function AppointmentDetailModal({
  appointment,
  open,
  onOpenChange,
  onEdit,
}: AppointmentDetailModalProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { updateStatusMutation, cancelMutation, deleteMutation } =
    useAppointmentMutations();

  if (!appointment) return null;

  const canModify =
    appointment.status !== "completed" && appointment.status !== "cancelled";

  const handleStatusChange = async (status: AppointmentStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: appointment.id,
        status,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: appointment.id,
        reason: cancelReason || undefined,
      });
      setShowCancelDialog(false);
      setCancelReason("");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(appointment.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting appointment:", error);
    }
  };

  const isPending =
    updateStatusMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AppointmentTypeBadge type={appointment.type} />
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
                <SheetTitle className="text-left">
                  {appointment.title || formatContactDisplay(appointment)}
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Fecha y hora */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha y hora
              </h3>
              <div className="pl-6 space-y-1">
                <p className="text-sm">
                  {formatAppointmentDateFull(appointment.scheduled_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duración: {formatDuration(appointment.duration_minutes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(appointment.scheduled_at)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Contacto */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contacto
              </h3>
              <div className="pl-6 space-y-1">
                <p className="text-sm font-medium">
                  {formatContactDisplay(appointment)}
                </p>
                {appointment.contact_phone && (
                  <p className="text-sm text-muted-foreground">
                    {appointment.contact_phone}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Asignación */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                {appointment.type === "call" ? (
                  <Phone className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                {appointment.type === "call" ? "Comercial" : "Sede"}
              </h3>
              <div className="pl-6 space-y-1">
                <p className="text-sm">{formatAssignment(appointment)}</p>
                {appointment.type === "in_person" &&
                  appointment.location_address && (
                    <p className="text-sm text-muted-foreground">
                      {formatLocationAddress(appointment)}
                    </p>
                  )}
                {appointment.type === "call" &&
                  appointment.call_phone_number && (
                    <p className="text-sm text-muted-foreground">
                      Tel: {appointment.call_phone_number}
                    </p>
                  )}
              </div>
            </div>

            {/* Descripción */}
            {appointment.description && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descripción
                  </h3>
                  <p className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                    {appointment.description}
                  </p>
                </div>
              </>
            )}

            {/* Notas del cliente */}
            {appointment.customer_notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notas del cliente
                  </h3>
                  <p className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                    {appointment.customer_notes}
                  </p>
                </div>
              </>
            )}

            {/* Razón de cancelación */}
            {appointment.status === "cancelled" &&
              appointment.cancelled_reason && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      Razón de cancelación
                    </h3>
                    <p className="pl-6 text-sm text-muted-foreground">
                      {appointment.cancelled_reason}
                    </p>
                  </div>
                </>
              )}

            {/* Información de llamada vinculada */}
            {appointment.call_id && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Llamada vinculada
                  </h3>
                  <div className="pl-6 space-y-1">
                    <p className="text-sm">Estado: {appointment.call_state}</p>
                    {appointment.call_duration && (
                      <p className="text-sm text-muted-foreground">
                        Duración: {Math.floor(appointment.call_duration / 60)}{" "}
                        min
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Acciones */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Acciones</h3>

              {canModify && (
                <div className="grid grid-cols-2 gap-2">
                  {appointment.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("confirmed")}
                      disabled={isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar
                    </Button>
                  )}

                  {(appointment.status === "scheduled" ||
                    appointment.status === "confirmed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("in_progress")}
                      disabled={isPending}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      En curso
                    </Button>
                  )}

                  {appointment.status === "in_progress" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("completed")}
                      disabled={isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completar
                    </Button>
                  )}

                  {(appointment.status === "scheduled" ||
                    appointment.status === "confirmed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("no_show")}
                      disabled={isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      No presentado
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {canModify && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onEdit?.(appointment)}
                      disabled={isPending}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}

                {appointment.status === "cancelled" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-4 text-xs text-muted-foreground">
              <p>Creada: {new Date(appointment.created_at).toLocaleString()}</p>
              {appointment.updated_at !== appointment.created_at && (
                <p>
                  Actualizada: {new Date(appointment.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Diálogo de cancelación */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Razón de cancelación (opcional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Ingresa la razón de la cancelación..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelando..." : "Cancelar cita"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
