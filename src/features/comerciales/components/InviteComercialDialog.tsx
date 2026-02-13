import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useQueryClient } from '@tanstack/react-query';
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
import { COMERCIALES_QUERY_KEY } from '../hooks/useComerciales';
import { useComercialRole } from '@/hooks/useComercialRole';
import type { ComercialRole } from '@/types/comercial';

const ROLE_RANK: Record<string, number> = {
  director_comercial_general: 1,
  director_sede: 2,
  comercial: 3,
};

interface RoleOption {
  value: ComercialRole;
  label: string;
  rank: number;
}

const ALL_INVITE_ROLES: RoleOption[] = [
  { value: 'director_comercial_general', label: 'Director Comercial General', rank: 1 },
  { value: 'director_sede', label: 'Director de Sede', rank: 2 },
  { value: 'comercial', label: 'Comercial', rank: 3 },
];

interface InviteComercialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: { id: string; name: string }[];
}

export function InviteComercialDialog({
  open,
  onOpenChange,
  locations,
}: InviteComercialDialogProps) {
  const { scope } = useAuth();
  const queryClient = useQueryClient();
  const { comercialRole: callerRole } = useComercialRole();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [comercialRole, setComercialRole] = useState<ComercialRole>('comercial');
  const [locationId, setLocationId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const callerRank = callerRole === null ? 0 : (ROLE_RANK[callerRole] ?? 99);
  const allowedRoles = useMemo(
    () => ALL_INVITE_ROLES.filter((opt) => opt.rank > callerRank),
    [callerRank]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName || !comercialRole || !externalId.trim()) {
      toast.error('Email, nombre, ID externo y rol son obligatorios');
      return;
    }

    if (comercialRole !== 'director_comercial_general' && !locationId) {
      toast.error('Debes seleccionar una sede');
      return;
    }

    try {
      setLoading(true);

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          full_name: fullName,
          role: 'user_client',
          tenant_id: scope?.tenantId,
          comercial_role: comercialRole,
          location_id: comercialRole === 'director_comercial_general' ? null : locationId,
          external_id: externalId.trim(),
        },
      });

      if (response.error) throw response.error;

      toast.success(`Invitacion enviada a ${email}`);
      queryClient.invalidateQueries({ queryKey: [COMERCIALES_QUERY_KEY] });

      // Reset form
      setEmail('');
      setFullName('');
      setExternalId('');
      setComercialRole('comercial');
      setLocationId('');
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar invitacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invitar Comercial</DialogTitle>
          <DialogDescription>
            Envia una invitacion para agregar un nuevo miembro al equipo comercial.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="comercial@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invite-name">Nombre Completo *</Label>
              <Input
                id="invite-name"
                type="text"
                placeholder="Juan Perez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invite-external-id">ID Externo (Software de Gestion) *</Label>
              <Input
                id="invite-external-id"
                type="text"
                placeholder="Ej: COM-001"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Rol Comercial *</Label>
              <Select
                value={comercialRole}
                onValueChange={(v) => setComercialRole(v as ComercialRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {comercialRole !== 'director_comercial_general' && (
              <div className="grid gap-2">
                <Label>Sede *</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Invitacion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
