import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { locationsRepo } from "../lib/repos/locations.repo";
import type { LocationFilters, TenantLocation } from "../types";

// ============================================================================
// Query Keys
// ============================================================================

export const LOCATIONS_QUERY_KEY = "locations";

export const locationsQueryKeys = {
  all: (tenantId: string) => [LOCATIONS_QUERY_KEY, tenantId] as const,
  list: (tenantId: string, filters: LocationFilters) =>
    [LOCATIONS_QUERY_KEY, tenantId, "list", filters] as const,
  active: (tenantId: string) =>
    [LOCATIONS_QUERY_KEY, tenantId, "active"] as const,
  detail: (tenantId: string, id: string) =>
    [LOCATIONS_QUERY_KEY, tenantId, "detail", id] as const,
  default: (tenantId: string) =>
    [LOCATIONS_QUERY_KEY, tenantId, "default"] as const,
};

// ============================================================================
// Hook: useLocations - Lista todas las locations
// ============================================================================

export function useLocations(filters: LocationFilters = {}) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: locationsQueryKeys.list(tenantId ?? "", filters),
    queryFn: () => locationsRepo.listLocations(filters),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    select: (data) => data.data,
  });
}

// ============================================================================
// Hook: useActiveLocations - Lista locations activas (para selectores)
// ============================================================================

export function useActiveLocations() {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: locationsQueryKeys.active(tenantId ?? ""),
    queryFn: () => locationsRepo.getActiveLocations(),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// ============================================================================
// Hook: useLocation - Obtiene una location por ID
// ============================================================================

export function useLocation(id: string | null) {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: locationsQueryKeys.detail(tenantId ?? "", id ?? ""),
    queryFn: () => locationsRepo.getLocationById(id!),
    enabled: !!tenantId && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// ============================================================================
// Hook: useDefaultLocation - Obtiene la location por defecto
// ============================================================================

export function useDefaultLocation() {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: locationsQueryKeys.default(tenantId ?? ""),
    queryFn: () => locationsRepo.getDefaultLocation(),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
