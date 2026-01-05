import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { getSyncLogs } from '../services/sync.service';

export function useSyncLogs(integrationId?: string, tenantId?: string, page = 1) {
  const { profile } = useProfile();

  // Use provided tenantId or fall back to user's tenant_id
  const effectiveTenantId = tenantId || profile?.tenant_id;

  return useQuery({
    queryKey: ['sync-logs', effectiveTenantId, integrationId, page],
    queryFn: () => getSyncLogs(integrationId, page),
    enabled: !!effectiveTenantId,
    staleTime: 30 * 1000, // 30 segundos
  });
}
