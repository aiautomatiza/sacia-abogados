import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import type { TenantModule } from '@/types/navigation';

interface TenantSettings {
  whatsapp_enabled: boolean;
  calls_enabled: boolean;
  whatsapp_webhook_url: string | null;
  calls_webhook_url: string | null;
  calls_phone_number: string | null;
}

export function useTenantSettings() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('whatsapp_enabled, calls_enabled, whatsapp_webhook_url, calls_webhook_url, calls_phone_number')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant settings:', error);
        throw error;
      }

      // Default values if no settings found
      return {
        whatsapp_enabled: data?.whatsapp_enabled ?? false,
        calls_enabled: data?.calls_enabled ?? false,
        whatsapp_webhook_url: data?.whatsapp_webhook_url ?? null,
        calls_webhook_url: data?.calls_webhook_url ?? null,
        calls_phone_number: data?.calls_phone_number ?? null,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    // Considerar carga completa:
    // 1. Perfil aún cargando
    // 2. TenantId existe pero aún no tenemos datos de settings
    isLoading: isProfileLoading || (!!tenantId && !query.data),
  };
}

/**
 * Hook centralizado para verificar acceso a módulos del tenant.
 * Mapea cada módulo a su configuración correspondiente en tenant_settings.
 *
 * Lógica de módulos:
 * - conversations: requiere whatsapp_enabled (WhatsApp es el canal principal)
 * - calls: requiere calls_enabled
 * - campaigns: requiere whatsapp_enabled OR calls_enabled
 */
export function useModuleAccess() {
  const { data: settings, isLoading } = useTenantSettings();

  // Mapa declarativo de módulos a su estado de habilitación
  const moduleAccess: Record<TenantModule, boolean> = {
    conversations: settings?.whatsapp_enabled ?? false,
    calls: settings?.calls_enabled ?? false,
    campaigns: (settings?.whatsapp_enabled ?? false) || (settings?.calls_enabled ?? false),
  };

  return {
    isLoading,
    /** Verifica si un módulo específico está habilitado */
    isModuleEnabled: (module: TenantModule): boolean => moduleAccess[module],
    /** Acceso directo a todos los módulos */
    modules: moduleAccess,
    /** Settings crudos del tenant */
    settings,
  };
}

// Computed helper to check if campaigns are available (mantiene compatibilidad)
export function useCampaignsEnabled() {
  const { data: settings, isLoading } = useTenantSettings();

  return {
    isLoading,
    enabled: !!(settings?.whatsapp_enabled || settings?.calls_enabled),
    whatsappEnabled: settings?.whatsapp_enabled || false,
    callsEnabled: settings?.calls_enabled || false,
  };
}
