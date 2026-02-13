import { supabase } from '@/integrations/supabase/client';
import type { UserScope } from '@/features/conversations';

/**
 * Applies comercial role-based visibility filters to a crm_contacts query.
 * - null role (owner): no additional filter
 * - director_comercial_general: no additional filter
 * - director_sede: only contacts in their sede (location_id matches)
 * - comercial: only contacts assigned to them
 *
 * Contacts without location_id or assigned_to are only visible to
 * users without comercial role and director_comercial_general.
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
      // Only contacts in their sede (excludes contacts without location)
      if (scope.locationId) {
        return query.eq('location_id', scope.locationId);
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
    query = query.eq('location_id', scope.locationId);
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
