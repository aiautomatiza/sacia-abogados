import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initiateOAuth, disconnectIntegration, updateSyncSettings } from '../services/integration.service';
import * as integrationsApi from '@/lib/api/endpoints/integrations.api';
import { useProfile } from '@/hooks/useProfile';
import type { UpdateSyncSettingsParams } from '../types';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

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
    mutationFn: async (integrationId: string) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return integrationsApi.disconnectIntegration(integrationId);
      } else {
        // OLD: Direct Supabase
        return disconnectIntegration(integrationId);
      }
    },
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
    mutationFn: async ({ integrationId, settings }: { integrationId: string; settings: UpdateSyncSettingsParams }) => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return integrationsApi.updateSyncSettings(integrationId, settings);
      } else {
        // OLD: Direct Supabase
        return updateSyncSettings(integrationId, settings);
      }
    },
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
