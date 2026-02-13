import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useComercialMutations } from '../hooks/useComercialMutations';
import { useComercialRole } from '@/hooks/useComercialRole';
import type { Comercial } from '../types';
import type { ComercialRole } from '@/types/comercial';

/**
 * Hierarchy rank: lower number = more powerful. null (admin) = 0.
 */
const ROLE_RANK: Record<string, number> = {
  none: 0, // admin/owner
  director_comercial_general: 1,
  director_sede: 2,
  comercial: 3,
};

function getCallerRank(role: ComercialRole | null): number {
  if (role === null) return 0;
  return ROLE_RANK[role] ?? 99;
}

interface RoleOption {
  value: ComercialRole | 'none';
  label: string;
  rank: number;
}

const ALL_ROLE_OPTIONS: RoleOption[] = [
  { value: 'none', label: 'Sin rol comercial (acceso total)', rank: 0 },
  { value: 'director_comercial_general', label: 'Director Comercial General', rank: 1 },
  { value: 'director_sede', label: 'Director de Sede', rank: 2 },
  { value: 'comercial', label: 'Comercial', rank: 3 },
];

interface ComercialRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Comercial | null;
  locations: { id: string; name: string }[];
}

export function ComercialRoleDialog({
  open,
  onOpenChange,
  user,
  locations,
}: ComercialRoleDialogProps) {
  const [role, setRole] = useState<ComercialRole | 'none'>('none');
  const [locationId, setLocationId] = useState<string>('');
  const [externalId, setExternalId] = useState<string>('');
  const { updateRole, removeRole } = useComercialMutations();
  const { comercialRole: callerRole } = useComercialRole();

  const callerRank = getCallerRank(callerRole);

  // Only show roles that are strictly below the caller's rank
  const allowedOptions = useMemo(
    () => ALL_ROLE_OPTIONS.filter((opt) => opt.rank > callerRank),
    [callerRank]
  );

  useEffect(() => {
    if (user) {
      setRole((user.comercial_role as ComercialRole) || 'none');
      setLocationId(user.location_id || '');
      setExternalId(user.external_id || '');
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    if (role === 'none') {
      removeRole.mutate(user.id, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      updateRole.mutate(
        {
          userId: user.id,
          comercialRole: role,
          locationId: role === 'director_sede' ? locationId || null : null,
          externalId: externalId.trim() || null,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isLoading = updateRole.isPending || removeRole.isPending;

  // Check if caller can manage this user (target must have lower rank or no role yet)
  const targetCurrentRank = user?.comercial_role ? (ROLE_RANK[user.comercial_role] ?? 99) : null;
  const canManageTarget = targetCurrentRank === null || targetCurrentRank > callerRank;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {user?.comercial_role ? 'Cambiar Rol Comercial' : 'Asignar Rol Comercial'}
          </DialogTitle>
          <DialogDescription>
            {user?.email}
          </DialogDescription>
        </DialogHeader>

        {!canManageTarget ? (
          <p className="py-4 text-sm text-muted-foreground">
            No tienes permisos para modificar el rol de este usuario.
          </p>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Rol Comercial</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ComercialRole | 'none')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {allowedOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role !== 'none' && (
              <div className="grid gap-2">
                <Label htmlFor="role-external-id">ID Externo (Software de Gestion) *</Label>
                <Input
                  id="role-external-id"
                  type="text"
                  placeholder="Ej: COM-001"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  required
                />
              </div>
            )}

            {role === 'director_sede' && (
              <div className="grid gap-2">
                <Label>Sede</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {canManageTarget && (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (role === 'director_sede' && !locationId) || (role !== 'none' && !externalId.trim())}
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
