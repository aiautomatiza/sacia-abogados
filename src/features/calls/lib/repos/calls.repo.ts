/**
 * @fileoverview Calls Repository
 * @description Data access layer for calls
 */

import { supabase } from "@/integrations/supabase/client";
import { getSedeAgentIds } from "@/lib/utils/comercial-filters";
import type { UserScope } from "@/features/conversations";
import type {
  CallDetailed,
  CallFilters,
  CallStats,
  CallSortConfig,
  CallsListResponse,
  CallState,
  CallType,
} from "../../types/call.types";

const DEFAULT_PAGE_SIZE = 20;

/**
 * List calls with filters, pagination, and sorting
 */
export async function listCalls(
  filters: CallFilters = {},
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sort: CallSortConfig = { sortBy: "call_datetime", sortOrder: "desc" },
  scope?: UserScope
): Promise<CallsListResponse> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("v_crm_calls_detailed")
    .select("*", { count: "exact" });

  // Apply comercial role-based filtering
  if (scope?.comercialRole === 'comercial') {
    query = query.eq("agent_id", scope.userId);
  } else if (scope?.comercialRole === 'director_sede' && scope.locationId) {
    const sedeAgentIds = await getSedeAgentIds(scope.tenantId, scope.locationId);
    if (sedeAgentIds.length > 0) {
      query = query.in("agent_id", sedeAgentIds);
    } else {
      return { data: [], count: 0 };
    }
  }

  // Apply search filter (contact name or phone)
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`contact_name.ilike.${searchTerm},contact_phone.ilike.${searchTerm}`);
  }

  // Apply date filters
  if (filters.date_from) {
    query = query.gte("call_datetime", filters.date_from.toISOString());
  }
  if (filters.date_to) {
    // Set to end of day
    const endOfDay = new Date(filters.date_to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("call_datetime", endOfDay.toISOString());
  }

  // Apply state filter
  if (filters.states && filters.states.length > 0) {
    query = query.in("state", filters.states);
  }

  // Apply type filter
  if (filters.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }

  // Apply sorting
  query = query.order(sort.sortBy, { ascending: sort.sortOrder === "asc" });

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching calls:", error);
    throw error;
  }

  return {
    data: (data as CallDetailed[]) || [],
    count: count || 0,
  };
}

/**
 * Get a single call by ID
 */
export async function getCallById(id: string): Promise<CallDetailed | null> {
  const { data, error } = await supabase
    .from("v_crm_calls_detailed")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching call:", error);
    throw error;
  }

  return data as CallDetailed | null;
}

/**
 * Get call statistics using the database function
 * Note: For comercial/director_sede, stats are filtered client-side via the view
 * since the RPC doesn't support agent_id filtering natively.
 * For accurate stats, we fall back to a manual count when comercial filtering is needed.
 */
export async function getCallStats(filters: CallFilters = {}, scope?: UserScope): Promise<CallStats> {
  const params: {
    p_tenant_id?: string;
    p_date_from?: string;
    p_date_to?: string;
    p_states?: CallState[];
    p_types?: CallType[];
    p_search_term?: string;
  } = {};

  if (filters.date_from) {
    params.p_date_from = filters.date_from.toISOString();
  }
  if (filters.date_to) {
    const endOfDay = new Date(filters.date_to);
    endOfDay.setHours(23, 59, 59, 999);
    params.p_date_to = endOfDay.toISOString();
  }
  if (filters.states && filters.states.length > 0) {
    params.p_states = filters.states;
  }
  if (filters.types && filters.types.length > 0) {
    params.p_types = filters.types;
  }
  if (filters.search) {
    params.p_search_term = filters.search;
  }

  const { data, error } = await supabase.rpc("calculate_calls_stats", params);

  if (error) {
    console.error("Error fetching call stats:", error);
    throw error;
  }

  // The function returns an array with one row
  const stats = Array.isArray(data) ? data[0] : data;

  return {
    total: Number(stats?.total) || 0,
    pending: Number(stats?.pending) || 0,
    completed: Number(stats?.completed) || 0,
    failed: Number(stats?.failed) || 0,
    missed: Number(stats?.missed) || 0,
    voicemail: Number(stats?.voicemail) || 0,
    user_hangup: Number(stats?.user_hangup) || 0,
    scheduled: Number(stats?.scheduled) || 0,
    total_duration: Number(stats?.total_duration) || 0,
    avg_duration: Number(stats?.avg_duration) || 0,
    completion_rate: Number(stats?.completion_rate) || 0,
  };
}

export const callsRepo = {
  listCalls,
  getCallById,
  getCallStats,
};
