import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

interface TenantSettings {
  whatsapp_enabled: boolean;
  calls_enabled: boolean;
  conversations_enabled: boolean;
  whatsapp_webhook_url: string | null;
  conversations_webhook_url: string | null;
}

export function useTenantSettings() {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('whatsapp_enabled, calls_enabled, conversations_enabled, whatsapp_webhook_url, conversations_webhook_url')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant settings:', error);
        throw error;
      }

      // Default values if no settings found
      return data || {
        whatsapp_enabled: false,
        calls_enabled: false,
        conversations_enabled: false,
        whatsapp_webhook_url: null,
        conversations_webhook_url: null,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Computed helper to check if campaigns are available
export function useCampaignsEnabled() {
  const { data: settings, isLoading } = useTenantSettings();

  return {
    isLoading,
    enabled: !!(settings?.whatsapp_enabled || settings?.calls_enabled),
    whatsappEnabled: settings?.whatsapp_enabled || false,
    callsEnabled: settings?.calls_enabled || false,
  };
}
