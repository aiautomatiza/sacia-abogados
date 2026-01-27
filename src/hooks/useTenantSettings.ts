import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import type { TenantModule } from '@/types/navigation';

interface TenantSettings {
  whatsapp_enabled: boolean;
  calls_enabled: boolean;
  conversations_enabled: boolean;
  appointments_enabled: boolean;
  whatsapp_webhook_url: string | null;
  calls_webhook_url: string | null;
  conversations_webhook_url: string | null;
  calls_phone_number: string | null;
  appointments_webhook_url: string | null;
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
        .select('whatsapp_enabled, calls_enabled, conversations_enabled, appointments_enabled, whatsapp_webhook_url, calls_webhook_url, conversations_webhook_url, calls_phone_number, appointments_webhook_url')
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
        conversations_enabled: data?.conversations_enabled ?? false,
        appointments_enabled: data?.appointments_enabled ?? false,
        whatsapp_webhook_url: data?.whatsapp_webhook_url ?? null,
        calls_webhook_url: data?.calls_webhook_url ?? null,
        conversations_webhook_url: data?.conversations_webhook_url ?? null,
        calls_phone_number: data?.calls_phone_number ?? null,
        appointments_webhook_url: data?.appointments_webhook_url ?? null,
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
 * - conversations: requiere conversations_enabled
 * - calls: requiere calls_enabled
 * - campaigns: derivado de whatsapp_enabled OR calls_enabled
 * - appointments: requiere appointments_enabled
 */
export function useModuleAccess() {
  const { data: settings, isLoading } = useTenantSettings();

  // Mapa declarativo de módulos a su estado de habilitación
  const moduleAccess: Record<TenantModule, boolean> = {
    conversations: settings?.conversations_enabled ?? false,
    calls: settings?.calls_enabled ?? false,
    campaigns: (settings?.whatsapp_enabled ?? false) || (settings?.calls_enabled ?? false),
    appointments: settings?.appointments_enabled ?? false,
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

// Computed helper to check if campaigns are available
// Campaigns are enabled when whatsapp OR calls are enabled
export function useCampaignsEnabled() {
  const { data: settings, isLoading } = useTenantSettings();

  return {
    isLoading,
    enabled: (settings?.whatsapp_enabled ?? false) || (settings?.calls_enabled ?? false),
    whatsappEnabled: settings?.whatsapp_enabled ?? false,
    callsEnabled: settings?.calls_enabled ?? false,
  };
}

// Computed helper to check if appointments are available
export function useAppointmentsEnabled() {
  const { data: settings, isLoading } = useTenantSettings();

  return {
    isLoading,
    isEnabled: settings?.appointments_enabled ?? false,
    // Alias for backwards compatibility
    enabled: settings?.appointments_enabled ?? false,
  };
}
