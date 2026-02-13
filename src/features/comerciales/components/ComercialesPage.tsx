import { useState, useMemo } from 'react';
import { UserCog, Plus, Shield, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useComerciales } from '../hooks/useComerciales';
import { useActiveLocations } from '@/features/locations/hooks/use-locations';
import { useComercialRole } from '@/hooks/useComercialRole';
import { ComercialRoleDialog } from './ComercialRoleDialog';
import { InviteComercialDialog } from './InviteComercialDialog';
import type { Comercial } from '../types';
import type { ComercialRole } from '@/types/comercial';

const ROLE_LABELS: Record<ComercialRole, string> = {
  director_comercial_general: 'Director Comercial General',
  director_sede: 'Director de Sede',
  comercial: 'Comercial',
};

const ROLE_COLORS: Record<ComercialRole, string> = {
  director_comercial_general: 'bg-purple-100 text-purple-800',
  director_sede: 'bg-blue-100 text-blue-800',
  comercial: 'bg-green-100 text-green-800',
};

const ROLE_ICONS: Record<ComercialRole, typeof Shield> = {
  director_comercial_general: ShieldCheck,
  director_sede: Shield,
  comercial: User,
};

const ROLE_RANK: Record<string, number> = {
  director_comercial_general: 1,
  director_sede: 2,
  comercial: 3,
};

function getCallerRank(role: ComercialRole | null): number {
  if (role === null) return 0; // admin
  return ROLE_RANK[role] ?? 99;
}

export function ComercialesPage() {
  const { comerciales, isLoading } = useComerciales();
  const { data: locations } = useActiveLocations();
  const { comercialRole, locationId: callerLocationId } = useComercialRole();
  const [selectedUser, setSelectedUser] = useState<Comercial | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const callerRank = getCallerRank(comercialRole);

  // Filter list based on caller's role:
  // - admin/director_general: see all
  // - director_sede: only users in their sede
  const filteredComerciales = useMemo(() => {
    if (comercialRole === 'director_sede' && callerLocationId) {
      return comerciales.filter((u) => u.location_id === callerLocationId);
    }
    return comerciales;
  }, [comerciales, comercialRole, callerLocationId]);

  const getLocationName = (locId: string | null) => {
    if (!locId || !locations) return '-';
    const loc = locations.find((l) => l.id === locId);
    return loc?.name || '-';
  };

  const canManageUser = (user: Comercial): boolean => {
    const targetRank = user.comercial_role ? (ROLE_RANK[user.comercial_role] ?? 99) : 0;
    return targetRank > callerRank;
  };

  const handleEditRole = (user: Comercial) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipo Comercial</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los roles y permisos del equipo comercial
            </p>
          </div>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invitar Comercial
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>ID Externo</TableHead>
              <TableHead>Rol Comercial</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredComerciales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay usuarios en este tenant
                </TableCell>
              </TableRow>
            ) : (
              filteredComerciales.map((user) => {
                const role = user.comercial_role as ComercialRole | null;
                const RoleIcon = role ? ROLE_ICONS[role] : null;
                const canManage = canManageUser(user);

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{user.external_id || '-'}</TableCell>
                    <TableCell>
                      {role ? (
                        <Badge variant="secondary" className={ROLE_COLORS[role]}>
                          {RoleIcon && <RoleIcon className="mr-1 h-3 w-3" />}
                          {ROLE_LABELS[role]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin rol comercial</span>
                      )}
                    </TableCell>
                    <TableCell>{getLocationName(user.location_id)}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(user)}
                        >
                          {role ? 'Cambiar Rol' : 'Asignar Rol'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ComercialRoleDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        user={selectedUser}
        locations={locations || []}
      />

      <InviteComercialDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        locations={locations || []}
      />
    </div>
  );
}
