import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useComerciales, useComercialesBySede } from '@/features/comerciales/hooks/useComerciales';
import { useAssignContact } from '@/features/comerciales/hooks/useAssignContact';
import { useActiveLocations } from '@/features/locations/hooks/use-locations';
import { useComercialRole } from '@/hooks/useComercialRole';

interface AssignContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  mode: 'single' | 'bulk';
}

export function AssignContactDialog({
  open,
  onOpenChange,
  contactIds,
  mode,
}: AssignContactDialogProps) {
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const { assignContact, assignContactsBulk } = useAssignContact();
  const { isDirectorSede, locationId: userLocationId } = useComercialRole();
  const { data: locations } = useActiveLocations();

  // Always call both hooks (rules of hooks), then pick the right result
  const allComerciales = useComerciales();
  const sedeComerciales = useComercialesBySede(userLocationId);
  const { comerciales } = isDirectorSede ? sedeComerciales : allComerciales;

  const handleSubmit = () => {
    const selectedAssignee = assignedTo === 'unassign' ? null : assignedTo || null;
    const selectedLocation = locationId || null;

    if (mode === 'single' && contactIds.length === 1) {
      assignContact.mutate(
        {
          contactId: contactIds[0],
          assignedTo: selectedAssignee,
          locationId: selectedLocation,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      assignContactsBulk.mutate(
        {
          contactIds,
          assignedTo: selectedAssignee,
          locationId: selectedLocation,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isLoading = assignContact.isPending || assignContactsBulk.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'single' ? 'Asignar Contacto' : `Asignar ${contactIds.length} Contactos`}
          </DialogTitle>
          <DialogDescription>
            Selecciona el comercial al que deseas asignar {mode === 'single' ? 'este contacto' : 'estos contactos'}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Comercial</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar comercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassign">Sin asignar</SelectItem>
                {comerciales
                  .filter((c) => c.comercial_role)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || c.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {!isDirectorSede && locations && locations.length > 0 && (
            <div className="grid gap-2">
              <Label>Sede (opcional)</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin sede</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
