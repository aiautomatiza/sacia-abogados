/**
 * @fileoverview Admin Routes
 * @description HTTP routes for admin operations (super admin only)
 * Phase 7: Tenant CRUD and Settings management
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as adminService from '../services/admin.service.ts';
import {
  createTenantSchema,
  updateTenantSettingsSchema,
  assignUserToTenantSchema,
} from '../utils/validation.ts';

export const adminRoutes = new Hono();

// ============================================================================
// TENANT ROUTES
// ============================================================================

/**
 * GET /api/admin/tenants
 * List all tenants with settings and user count
 * Super admin only
 *
 * Response:
 * {
 *   data: Tenant[]
 * }
 */
adminRoutes.get('/tenants', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const adminClient = c.get('adminClient') as SupabaseClient;

  const tenants = await adminService.listTenants(adminClient, userScope);

  return c.json({ data: tenants });
});

/**
 * POST /api/admin/tenants
 * Create a new tenant with default settings
 * Super admin only
 *
 * Request body:
 * {
 *   name: string (required)
 *   company_name?: string
 *   contact_email?: string
 *   contact_phone?: string
 *   status?: 'active' | 'inactive' | 'suspended'
 * }
 *
 * Response: Tenant (201)
 */
adminRoutes.post(
  '/tenants',
  zValidator('json', createTenantSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const adminClient = c.get('adminClient') as SupabaseClient;
    const tenantData = c.req.valid('json');

    const tenant = await adminService.createTenant(
      adminClient,
      userScope,
      tenantData
    );

    return c.json(tenant, 201);
  }
);

/**
 * DELETE /api/admin/tenants/:id
 * Delete a tenant (CASCADE will delete everything)
 * Super admin only
 *
 * Response:
 * {
 *   success: true
 * }
 */
adminRoutes.delete('/tenants/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const adminClient = c.get('adminClient') as SupabaseClient;
  const id = c.req.param('id');

  await adminService.deleteTenant(adminClient, userScope, id);

  return c.json({ success: true });
});

/**
 * POST /api/admin/tenants/assign-user
 * Assign a user to a tenant
 * Super admin only
 *
 * Request body:
 * {
 *   user_id: string (required)
 *   tenant_id: string (required)
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
adminRoutes.post(
  '/tenants/assign-user',
  zValidator('json', assignUserToTenantSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const adminClient = c.get('adminClient') as SupabaseClient;
    const { user_id, tenant_id } = c.req.valid('json');

    await adminService.assignUserToTenant(
      adminClient,
      userScope,
      user_id,
      tenant_id
    );

    return c.json({ success: true });
  }
);

// ============================================================================
// TENANT SETTINGS ROUTES
// ============================================================================

/**
 * GET /api/admin/tenant-settings/:tenantId
 * Get tenant settings
 * Super admin only
 *
 * Response: TenantSettings
 */
adminRoutes.get('/tenant-settings/:tenantId', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const adminClient = c.get('adminClient') as SupabaseClient;
  const tenantId = c.req.param('tenantId');

  const settings = await adminService.getTenantSettings(
    adminClient,
    userScope,
    tenantId
  );

  return c.json(settings);
});

/**
 * PATCH /api/admin/tenant-settings/:tenantId
 * Update tenant settings with validation
 * Super admin only
 *
 * Request body (all fields optional):
 * {
 *   whatsapp_enabled?: boolean
 *   whatsapp_webhook_url?: string | null
 *   calls_enabled?: boolean
 *   calls_webhook_url?: string | null
 *   calls_phone_number?: string | null
 *   conversations_enabled?: boolean
 *   conversations_webhook_url?: string | null
 *   credentials?: {
 *     whatsapp?: Record<string, any>
 *     calls?: Record<string, any>
 *     conversations?: Record<string, any>
 *   }
 * }
 *
 * Response: TenantSettings
 */
adminRoutes.patch(
  '/tenant-settings/:tenantId',
  zValidator('json', updateTenantSettingsSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const adminClient = c.get('adminClient') as SupabaseClient;
    const tenantId = c.req.param('tenantId');
    const { credentials, ...settings } = c.req.valid('json');

    const updatedSettings = await adminService.updateTenantSettings(
      adminClient,
      userScope,
      tenantId,
      settings,
      credentials
    );

    return c.json(updatedSettings);
  }
);
