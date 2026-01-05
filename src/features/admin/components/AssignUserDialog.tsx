import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  onSuccess: () => void;
}

interface User {
  id: string;
  email: string;
  tenant_id: string | null;
}

export function AssignUserDialog({ open, onOpenChange, tenantId, onSuccess }: AssignUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!open) return;
      
      try {
        // Get all users without tenant or from current tenant
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, tenant_id')
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);

        if (error) throw error;
        setUsers(data || []);
      } catch (error: any) {
        toast.error('Error al cargar usuarios: ' + error.message);
      }
    };

    fetchUsers();
  }, [open, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !tenantId) return;

    try {
      setLoading(true);

      const response = await supabase.functions.invoke('manage-tenants', {
        body: {
          action: 'assign_user',
          tenant_data: {
            user_id: selectedUser,
            tenant_id: tenantId
          }
        },
      });

      if (response.error) throw response.error;

      toast.success('Usuario asignado correctamente');
      setSelectedUser('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error('Error al asignar usuario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Usuario al Cliente</DialogTitle>
          <DialogDescription>
            Selecciona un usuario para asignarlo a este cliente
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} {user.tenant_id ? '(ya asignado)' : '(sin asignar)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedUser}>
              {loading ? 'Asignando...' : 'Asignar Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
