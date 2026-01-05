import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { getIntegrations } from '../services/integration.service';

export function useIntegrations(tenantId?: string) {
  const { profile } = useProfile();

  // Use provided tenantId or fall back to user's tenant_id
  const effectiveTenantId = tenantId || profile?.tenant_id;

  return useQuery({
    queryKey: ['integrations', effectiveTenantId],
    queryFn: () => getIntegrations(effectiveTenantId),
    enabled: !!effectiveTenantId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
