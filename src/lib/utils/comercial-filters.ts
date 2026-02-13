import { supabase } from '@/integrations/supabase/client';
import type { UserScope } from '@/features/conversations';

/**
 * Applies comercial role-based visibility filters to a crm_contacts query.
 * - null role (owner): no additional filter
 * - director_comercial_general: no additional filter
 * - director_sede: contacts in their sede + unassigned contacts (location_id IS NULL)
 * - comercial: only contacts assigned to them
 */
// Supabase query builder types are complex, generic constraint needs any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyContactVisibilityFilter<T extends Record<string, any>>(
  query: T,
  scope: UserScope
): T {
  if (!scope.comercialRole) return query;

  switch (scope.comercialRole) {
    case 'director_comercial_general':
      // Full access
      return query;

    case 'director_sede':
      // Contacts in their sede + unassigned (no location)
      if (scope.locationId) {
        return query.or(`location_id.eq.${scope.locationId},location_id.is.null`);
      }
      return query;

    case 'comercial':
      // Only contacts assigned to them
      return query.eq('assigned_to', scope.userId);

    default:
      return query;
  }
}

/**
 * Pre-fetches visible contact IDs for the current user's comercial scope.
 * Used by conversations, calls, etc. that need to filter by contact visibility.
 * Returns null if no filtering is needed (full access).
 */
export async function getVisibleContactIdsForScope(
  scope: UserScope
): Promise<string[] | null> {
  // No filtering needed for these roles
  if (!scope.comercialRole || scope.comercialRole === 'director_comercial_general') {
    return null;
  }

  let query = supabase
    .from('crm_contacts')
    .select('id')
    .eq('tenant_id', scope.tenantId);

  if (scope.comercialRole === 'director_sede' && scope.locationId) {
    query = query.or(`location_id.eq.${scope.locationId},location_id.is.null`);
  } else if (scope.comercialRole === 'comercial') {
    query = query.eq('assigned_to', scope.userId);
  }

  const { data, error } = await query.limit(5000);

  if (error) {
    console.error('Error fetching visible contact IDs:', error);
    throw error;
  }

  return data?.map(c => c.id) || [];
}

/**
 * Pre-fetches agent IDs for profiles in the same sede.
 * Used by calls/appointments to filter by agents in the same location.
 */
export async function getSedeAgentIds(
  tenantId: string,
  locationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId);

  if (error) {
    console.error('Error fetching sede agent IDs:', error);
    throw error;
  }

  return data?.map(p => p.id) || [];
}
