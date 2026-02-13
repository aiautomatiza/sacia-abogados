import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

// ============================================================================
// Tipos
// ============================================================================

export interface TenantAgent {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string | null;
  comercial_role: string | null;
  location_id: string | null;
}

// ============================================================================
// Query Key
// ============================================================================

export const TENANT_AGENTS_QUERY_KEY = "tenant-agents";

// ============================================================================
// Funcion para obtener agentes del tenant
// ============================================================================

async function fetchTenantAgents(tenantId: string): Promise<TenantAgent[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, tenant_id, comercial_role, location_id")
    .eq("tenant_id", tenantId)
    .order("email", { ascending: true });

  if (error) throw error;
  return data as TenantAgent[];
}

// ============================================================================
// Hook: useTenantAgents
// Obtiene los usuarios/agentes del tenant actual para asignar a citas
// ============================================================================

export function useTenantAgents() {
  const { profile } = useProfile();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: [TENANT_AGENTS_QUERY_KEY, tenantId],
    queryFn: () => fetchTenantAgents(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutos (los agentes no cambian frecuentemente)
  });

  return {
    agents: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// Hook: useAgentById
// Obtiene un agente especifico por ID
// ============================================================================

export function useAgentById(agentId: string | null) {
  const { agents, isLoading } = useTenantAgents();

  const agent = agentId
    ? agents.find((a) => a.id === agentId) || null
    : null;

  return {
    agent,
    isLoading,
  };
}

// ============================================================================
// Hook: useAgentOptions
// Retorna agentes formateados para usar en selectores
// ============================================================================

export function useAgentOptions() {
  const { agents, isLoading } = useTenantAgents();

  const options = agents.map((agent) => ({
    value: agent.id,
    label: agent.email,
  }));

  return {
    options,
    isLoading,
  };
}
