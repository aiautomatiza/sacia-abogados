import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initiateOAuth, disconnectIntegration, updateSyncSettings } from '../services/integration.service';
import { useProfile } from '@/hooks/useProfile';
import type { UpdateSyncSettingsParams } from '../types';

export function useIntegrationMutations() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  const connectIntegration = useMutation({
    mutationFn: ({ integrationName, tenantId }: { integrationName: string; tenantId?: string }) =>
      initiateOAuth(integrationName, tenantId),
    onSuccess: (data) => {
      // Redirigir al usuario a la URL de autorización OAuth
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error('No se recibió URL de autorización');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al iniciar conexión');
    },
  });

  const disconnect = useMutation({
    mutationFn: disconnectIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', profile?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs', profile?.tenant_id] });
      toast.success('Integración desconectada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al desconectar integración');
    },
  });

  const updateSettings = useMutation({
    mutationFn: ({ integrationId, settings }: { integrationId: string; settings: UpdateSyncSettingsParams }) =>
      updateSyncSettings(integrationId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', profile?.tenant_id] });
      toast.success('Configuración actualizada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar configuración');
    },
  });

  return {
    connectIntegration,
    disconnect,
    updateSettings,
  };
}
