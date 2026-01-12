/**
 * @fileoverview Status Manager Component
 * @description Admin component for managing contact statuses (CRUD + reordering)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRealtime } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useContactStatuses } from '../hooks/useContactStatuses';
import { useContactStatusMutations } from '../hooks/useContactStatusMutations';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';
import { STATUS_COLOR_PALETTE, SUGGESTED_STATUS_ICONS } from '@/lib/validations/contact-status';
import type { ContactStatusFormData, ContactStatusWithUsageCount } from '../types';

/**
 * StatusManager - Admin component for managing contact statuses
 *
 * Features:
 * - Create/Edit/Delete statuses
 * - Reorder statuses (up/down buttons)
 * - Color picker from predefined palette
 * - Icon picker from suggested icons
 * - Usage count display
 * - Default status management
 *
 * @example
 * <StatusManager />
 */
export function StatusManager() {
  const { scope } = useAuth();
  const { data: statuses, isLoading } = useContactStatuses();
  const { createStatus, updateStatus, deleteStatus, reorderStatuses } = useContactStatusMutations();

  // Realtime subscriptions for status changes
  useRealtime({
    subscriptions: [
      {
        table: 'crm_contact_statuses',
        event: '*',
        filter: `tenant_id=eq.${scope?.tenantId}`,
        queryKeysToInvalidate: [['contact-statuses']],
      },
    ],
    enabled: !!scope?.tenantId,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ContactStatusWithUsageCount | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<ContactStatusWithUsageCount | null>(null);

  // Form state
  const [formData, setFormData] = useState<ContactStatusFormData>({
    name: '',
    color: '#3B82F6',
    icon: 'user-plus',
    is_default: false,
  });

  const handleOpenDialog = (status?: ContactStatusWithUsageCount) => {
    if (status) {
      setEditingStatus(status);
      setFormData({
        name: status.name,
        color: status.color,
        icon: status.icon || 'user-plus',
        is_default: status.is_default,
      });
    } else {
      setEditingStatus(null);
      setFormData({
        name: '',
        color: '#3B82F6',
        icon: 'user-plus',
        is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (editingStatus) {
      updateStatus.mutate(
        { id: editingStatus.id, data: formData },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingStatus(null);
          },
        }
      );
    } else {
      createStatus.mutate(formData, {
        onSuccess: () => {
          setDialogOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (statusToDelete) {
      deleteStatus.mutate(statusToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setStatusToDelete(null);
        },
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (!statuses || index === 0) return;

    const newOrder = [...statuses];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

    reorderStatuses.mutate(newOrder.map(s => s.id));
  };

  const handleMoveDown = (index: number) => {
    if (!statuses || index === statuses.length - 1) return;

    const newOrder = [...statuses];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    reorderStatuses.mutate(newOrder.map(s => s.id));
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando estados...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Estados de Contactos</h2>
          <p className="text-muted-foreground">
            Gestiona los estados para clasificar tus contactos
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Estado
        </Button>
      </div>

      {/* Status List */}
      <div className="space-y-3">
        {statuses && statuses.length > 0 ? (
          statuses.map((status, index) => (
            <Card key={status.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === statuses.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Status badge */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status} />
                    {status.is_default && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Por defecto
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Usage count */}
                <div className="text-sm text-muted-foreground">
                  {status.usage_count} {status.usage_count === 1 ? 'contacto' : 'contactos'}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(status)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setStatusToDelete(status);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No hay estados configurados. Crea el primero para comenzar.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? 'Editar Estado' : 'Nuevo Estado'}
            </DialogTitle>
            <DialogDescription>
              {editingStatus
                ? 'Modifica los detalles del estado'
                : 'Crea un nuevo estado para tus contactos'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Cliente VIP"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {STATUS_COLOR_PALETTE.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className="h-10 rounded-md border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color.value,
                      borderColor: formData.color === color.value ? '#000' : 'transparent',
                    }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icono</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUGGESTED_STATUS_ICONS.map((iconName) => {
                    const IconComponent = (LucideIcons as any)[iconName];
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          {iconName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Default checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked === true })
                }
              />
              <Label
                htmlFor="is_default"
                className="text-sm font-normal cursor-pointer"
              >
                Establecer como estado por defecto
              </Label>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <StatusBadge
                status={{
                  id: '',
                  tenant_id: '',
                  name: formData.name || 'Nombre del estado',
                  color: formData.color,
                  icon: formData.icon,
                  display_order: 0,
                  is_default: formData.is_default,
                  is_active: true,
                  created_at: '',
                  updated_at: '',
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createStatus.isPending || updateStatus.isPending}
            >
              {editingStatus ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
            <AlertDialogDescription>
              {statusToDelete && (
                <>
                  <div className="mb-3">
                    Estás a punto de eliminar el estado:{' '}
                    <StatusBadge status={statusToDelete} className="inline-flex" />
                  </div>
                  {statusToDelete.usage_count > 0 && (
                    <div className="text-yellow-600 dark:text-yellow-500">
                      Este estado está asignado a {statusToDelete.usage_count}{' '}
                      {statusToDelete.usage_count === 1 ? 'contacto' : 'contactos'}. Los
                      contactos quedarán sin estado asignado.
                    </div>
                  )}
                  <div className="mt-2">Esta acción no se puede deshacer.</div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
