import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { listComerciales } from '../services/comercial.service';
import type { Comercial } from '../types';

export const COMERCIALES_QUERY_KEY = 'comerciales';

export function useComerciales() {
  const { scope } = useAuth();
  const tenantId = scope?.tenantId;

  const query = useQuery({
    queryKey: [COMERCIALES_QUERY_KEY, tenantId],
    queryFn: () => listComerciales(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    comerciales: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get comerciales filtered by location (for director_sede assignment)
 */
export function useComercialesBySede(locationId: string | null) {
  const { comerciales, isLoading } = useComerciales();

  const filtered = locationId
    ? comerciales.filter(
        (c) => c.location_id === locationId || c.comercial_role === 'director_comercial_general'
      )
    : comerciales;

  return {
    comerciales: filtered,
    isLoading,
  };
}
