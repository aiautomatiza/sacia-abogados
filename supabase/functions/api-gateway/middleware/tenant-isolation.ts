/**
 * @fileoverview Tenant Isolation Middleware
 * @description Middleware for validating tenant isolation and access control
 */

import type { Context, Next } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import type { UserScope } from '../types/shared.types.ts';

/**
 * Tenant isolation middleware
 * Validates that user has a valid tenant association (except for super admins)
 * Logs tenant context for auditing
 *
 * @param c - Hono context
 * @param next - Next middleware
 * @returns Response with 403 if tenant validation fails, or continues to next middleware
 */
export async function tenantIsolationMiddleware(c: Context, next: Next) {
  const userScope = c.get('userScope') as UserScope;

  if (!userScope) {
    console.error('[tenant] UserScope not found in context');
    return c.json({
      error: 'Authentication context missing',
      timestamp: new Date().toISOString()
    }, 500);
  }

  // Super admins can bypass tenant checks
  if (userScope.isSuperAdmin) {
    console.log('[tenant] Super admin access:', {
      userId: userScope.userId,
      path: c.req.path,
      method: c.req.method,
    });
    await next();
    return;
  }

  // Validate that tenant_id exists for non-super-admin users
  if (!userScope.tenantId || userScope.tenantId.trim() === '') {
    console.error('[tenant] User has no tenant association:', {
      userId: userScope.userId,
      path: c.req.path,
      method: c.req.method,
    });
    return c.json({
      error: 'User has no tenant association',
      timestamp: new Date().toISOString()
    }, 403);
  }

  // Log tenant context for auditing
  console.log('[tenant] Request from tenant:', {
    userId: userScope.userId,
    tenantId: userScope.tenantId,
    path: c.req.path,
    method: c.req.method,
  });

  await next();
}

/**
 * Validates that a resource belongs to the current user's tenant
 * This provides application-level defense-in-depth security in addition to RLS
 *
 * @param resourceTenantId - The tenant_id of the resource being accessed
 * @param currentScope - The current user's scope (userId, tenantId, isSuperAdmin)
 * @param resourceType - The type of resource for error reporting (e.g., 'contact', 'conversation')
 * @throws Error if resource does not belong to current tenant
 *
 * @example
 * await assertTenantAccess(contact.tenant_id, userScope, 'contact');
 */
export function assertTenantAccess(
  resourceTenantId: string,
  currentScope: UserScope,
  resourceType: string
): void {
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
