import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Tenant {
  id: string;
  name: string;
}

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'user_client' | 'super_admin'>('user_client');
  const [tenantId, setTenantId] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTenants();
    }
  }, [open]);

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);

      const response = await supabase.functions.invoke('manage-tenants', {
        body: { action: 'list' },
      });

      if (response.error) throw response.error;
      setTenants(response.data || []);
    } catch (error: any) {
      toast.error('Error al cargar clientes: ' + error.message);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!email || !fullName || !role) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    if (role === 'user_client' && !tenantId) {
      toast.error('Debes seleccionar un cliente para usuarios tipo user_client');
      return;
    }

    try {
      setLoading(true);

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          full_name: fullName,
          role,
          tenant_id: role === 'user_client' ? tenantId : null,
        },
      });

      if (response.error) throw response.error;

      toast.success(`Invitación enviada a ${email}`, {
        description: 'El usuario recibirá un correo para configurar su cuenta'
      });
      
      // Reset form
      setEmail('');
      setFullName('');
      setRole('user_client');
      setTenantId('');
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.message || 'Error desconocido';
      
      if (errorMessage.includes('ya está registrado')) {
        toast.error('Este email ya tiene una cuenta', {
          description: 'Este usuario ya está registrado en el sistema. Usa "Asignar Usuario" para añadirlo a este cliente.'
        });
      } else if (errorMessage.includes('invitación pendiente')) {
        toast.error('Invitación pendiente', {
          description: 'Ya existe una invitación activa para este email. Espera a que el usuario complete el registro o cancela la invitación anterior.'
        });
      } else {
        toast.error('Error al invitar usuario', {
          description: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Envía una invitación por correo para crear un nuevo usuario en la plataforma.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Tipo de Usuario *</Label>
              <Select value={role} onValueChange={(value: 'user_client' | 'super_admin') => {
                setRole(value);
                if (value === 'super_admin') {
                  setTenantId('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_client">Usuario Cliente</SelectItem>
                  <SelectItem value="super_admin">Super Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'user_client' && (
              <div className="grid gap-2">
                <Label htmlFor="tenant">Cliente *</Label>
                <Select value={tenantId} onValueChange={setTenantId} disabled={loadingTenants}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
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
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
