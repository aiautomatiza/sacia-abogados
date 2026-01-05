import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { getIntegrations } from '../services/integration.service';

export function useIntegrations() {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ['integrations', profile?.tenant_id],
    queryFn: () => getIntegrations(profile?.tenant_id),
    enabled: !!profile?.tenant_id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
