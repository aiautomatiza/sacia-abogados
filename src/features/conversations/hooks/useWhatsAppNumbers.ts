import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { listWhatsAppNumbers, getDefaultWhatsAppNumber } from "../services/whatsapp-number.service";

/**
 * Hook to fetch all WhatsApp numbers for a tenant
 * @param tenantIdOverride - Optional tenant ID for super admin to query other tenants
 */
export function useWhatsAppNumbers(tenantIdOverride?: string) {
  const { scope, isAuthenticated } = useAuth();
  const tenantId = tenantIdOverride || scope?.tenantId;

  return useQuery({
    queryKey: ["whatsapp-numbers", tenantId],
    queryFn: async () => {
      if (!tenantId || !scope?.userId) throw new Error("No tenant ID or user ID available");
      return listWhatsAppNumbers({
        userId: scope.userId,
        tenantId,
        isSuperAdmin: scope?.isSuperAdmin || false,
      });
    },
    enabled: !!tenantId && !!scope?.userId && isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to fetch the default WhatsApp number for a tenant
 * @param tenantIdOverride - Optional tenant ID for super admin to query other tenants
 */
export function useDefaultWhatsAppNumber(tenantIdOverride?: string) {
  const { scope, isAuthenticated } = useAuth();
  const tenantId = tenantIdOverride || scope?.tenantId;

  return useQuery({
    queryKey: ["whatsapp-numbers", "default", tenantId],
    queryFn: async () => {
      if (!tenantId || !scope?.userId) throw new Error("No tenant ID or user ID available");
      return getDefaultWhatsAppNumber({
        userId: scope.userId,
        tenantId,
        isSuperAdmin: scope?.isSuperAdmin || false,
      });
    },
    enabled: !!tenantId && !!scope?.userId && isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000,
  });
}
