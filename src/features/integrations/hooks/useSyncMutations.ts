import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { syncContacts } from '../services/sync.service';
import { useProfile } from '@/hooks/useProfile';

export function useSyncMutations() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  const sync = useMutation({
    mutationFn: syncContacts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['integrations', profile?.tenant_id] });

      const message = data.failed > 0
        ? `Sincronizados ${data.processed} contactos (${data.failed} fallidos)`
        : `Sincronizados ${data.processed} contactos correctamente`;

      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al sincronizar contactos');
    },
  });

  return { sync };
}
