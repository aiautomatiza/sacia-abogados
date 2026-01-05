/**
 * @fileoverview Tenant Utilities
 * @description Centralized utilities for tenant isolation and user scope management
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserScope } from '@/features/conversations';

/**
 * Gets the current authenticated user's tenant ID
 * @throws {Error} If user is not authenticated or profile not found
 * @returns Promise<string> The tenant ID
 */
export async function getCurrentTenantId(): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Authentication error: ${authError.message}`);
  }

  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  if (!profile?.tenant_id) {
    throw new Error('User profile has no tenant_id. Please contact support.');
  }

  return profile.tenant_id;
}

/**
 * Gets the current user's complete scope (userId, tenantId, isSuperAdmin)
 * Useful for operations that need full user context
 *
 * @throws {Error} If user is not authenticated or profile not found
 * @returns Promise<UserScope> The complete user scope
 */
export async function getCurrentUserScope(): Promise<UserScope> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Authentication error: ${authError.message}`);
  }

  if (!user) {
    throw new Error('No authenticated user');
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  // Get role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const isSuperAdmin = roleData?.role === 'super_admin';

  // SuperAdmins may not have a tenant_id - that's OK
  if (!profile?.tenant_id && !isSuperAdmin) {
    throw new Error('User profile has no tenant_id. Please contact support.');
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id || '', // Empty string for superAdmins without tenant
    isSuperAdmin,
  };
}

/**
 * Validates that a tenant ID belongs to the current user
 * Useful for security checks before operations
 *
 * @param tenantId - The tenant ID to validate
 * @returns Promise<boolean> True if tenant belongs to user
 */
export async function validateTenantAccess(tenantId: string): Promise<boolean> {
  try {
    const currentTenantId = await getCurrentTenantId();
    return currentTenantId === tenantId;
  } catch {
    return false;
  }
}

/**
 * Asserts that a resource belongs to the current user's tenant
 * Throws an error if the resource does not belong to the current tenant
 * This provides application-level defense-in-depth security in addition to RLS
 *
 * @param resourceTenantId - The tenant_id of the resource being accessed
 * @param currentScope - The current user's scope (userId, tenantId, isSuperAdmin)
 * @param resourceType - The type of resource for error reporting (e.g., 'contact', 'conversation')
 * @throws {Error} If resource does not belong to current tenant
 *
 * @example
 * const contact = await getContactFromDB(id);
 * await assertTenantAccess(contact.tenant_id, scope, 'contact');
 */
export async function assertTenantAccess(
  resourceTenantId: string,
  currentScope: UserScope,
  resourceType: string
): Promise<void> {
  // Super admins can access all tenants
  if (currentScope.isSuperAdmin) {
    return;
  }

  // Validate tenant isolation
  if (resourceTenantId !== currentScope.tenantId) {
    // Log security violation for monitoring
    console.error('[SECURITY] Tenant isolation violation detected', {
      userId: currentScope.userId,
      userTenantId: currentScope.tenantId,
      resourceTenantId,
      resourceType,
      timestamp: new Date().toISOString(),
    });

    throw new Error(`Access denied: ${resourceType} does not belong to your organization`);
  }
}
