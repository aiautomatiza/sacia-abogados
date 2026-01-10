import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { getIntegrations } from '../services/integration.service';
import * as integrationsApi from '@/lib/api/endpoints/integrations.api';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useIntegrations(tenantId?: string) {
  const { profile } = useProfile();

  // Use provided tenantId or fall back to user's tenant_id
  const effectiveTenantId = tenantId || profile?.tenant_id;

  return useQuery({
    queryKey: ['integrations', effectiveTenantId],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const response = await integrationsApi.getIntegrations();
        return response.data;
      } else {
        // OLD: Direct Supabase
        return getIntegrations(effectiveTenantId);
      }
    },
    enabled: !!effectiveTenantId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
