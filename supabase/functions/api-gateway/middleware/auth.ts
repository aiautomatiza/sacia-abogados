/**
 * @fileoverview Authentication Middleware
 * @description Middleware for extracting and validating user authentication context
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Context, Next } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import type { UserScope } from '../types/shared.types.ts';

/**
 * Authentication middleware
 * Extracts JWT from Authorization header, validates user, and builds UserScope
 *
 * Sets the following in Hono context:
 * - userScope: UserScope object with userId, tenantId, isSuperAdmin
 * - supabaseClient: Supabase client with user context
 *
 * @param c - Hono context
 * @param next - Next middleware
 * @returns Response with 401 if authentication fails, or continues to next middleware
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({
      error: 'No authorization header',
      timestamp: new Date().toISOString()
    }, 401);
  }

  try {
    // Create user-scoped Supabase client
    const supabaseClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('[auth] Authentication failed:', userError?.message);
      return c.json({
        error: 'Invalid authentication token',
        timestamp: new Date().toISOString()
      }, 401);
    }

    // Get user profile with tenant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[auth] Profile not found for user:', user.id);
      return c.json({
        error: 'User profile not found',
        timestamp: new Date().toISOString()
      }, 400);
    }

    // Get user role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = roleData?.role === 'super_admin';

    // Build UserScope
    const userScope: UserScope = {
      userId: user.id,
      tenantId: profile.tenant_id || '', // Empty string for super admins without tenant
      isSuperAdmin,
    };

    // Log authentication context (for debugging)
    console.log('[auth] Authenticated:', {
      userId: userScope.userId,
      tenantId: userScope.tenantId,
      isSuperAdmin: userScope.isSuperAdmin,
      path: c.req.path,
      method: c.req.method,
    });

    // Store in context for downstream middleware and handlers
    c.set('userScope', userScope);
    c.set('supabaseClient', supabaseClient);

    await next();
  } catch (error) {
    console.error('[auth] Unexpected error:', error);
    return c.json({
      error: 'Authentication error',
      timestamp: new Date().toISOString()
    }, 500);
  }
}

/**
 * Admin middleware
 * Creates an admin client with service role key for privileged operations
 * Should be used AFTER authMiddleware
 *
 * Sets the following in Hono context:
 * - adminClient: Supabase client with service role key
 *
 * @param c - Hono context
 * @param next - Next middleware
 * @returns Response with 403 if not super admin, or continues to next middleware
 */
export async function adminMiddleware(c: Context, next: Next) {
  try {
    const userScope = c.get('userScope') as UserScope;

    // Verify user is super admin
    if (!userScope || !userScope.isSuperAdmin) {
      return c.json({
        error: 'No autorizado - requiere rol superAdmin',
        timestamp: new Date().toISOString()
      }, 403);
    }

    // Create admin client with service role key
    const adminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store admin client in context
    c.set('adminClient', adminClient);

    console.log('[admin] Super admin access granted:', {
      userId: userScope.userId,
      path: c.req.path,
      method: c.req.method,
    });

    await next();
  } catch (error) {
    console.error('[admin] Unexpected error:', error);
    return c.json({
      error: 'Admin authorization failed',
      timestamp: new Date().toISOString()
    }, 500);
  }
}
