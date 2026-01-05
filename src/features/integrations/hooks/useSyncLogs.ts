import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { getSyncLogs } from '../services/sync.service';

export function useSyncLogs(integrationId?: string, page = 1) {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ['sync-logs', profile?.tenant_id, integrationId, page],
    queryFn: () => getSyncLogs(integrationId, page),
    enabled: !!profile?.tenant_id,
    staleTime: 30 * 1000, // 30 segundos
  });
}
