/**
 * @fileoverview Admin Service
 * @description Service functions for admin operations with dual-path support
 * Maintains compatibility with existing Edge Functions while supporting API Gateway
 */

import { supabase } from '@/integrations/supabase/client';
import * as adminApi from '@/lib/api/endpoints/admin.api';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

// ============================================================================
// TENANT OPERATIONS
// ============================================================================

/**
 * List all tenants with settings and user count
 */
export async function listTenants() {
  if (USE_API_GATEWAY) {
    // NEW: API Gateway
    const response = await adminApi.getTenants();
    return response.data;
  } else {
    // OLD: Edge Function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
    }

    const response = await supabase.functions.invoke('manage-tenants', {
      body: { action: 'list' },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) throw response.error;
    return response.data || [];
  }
}

/**
 * Create a new tenant
 */
export async function createTenant(tenantData: adminApi.CreateTenantInput) {
  if (USE_API_GATEWAY) {
    // NEW: API Gateway
    return adminApi.createTenant(tenantData);
  } else {
    // OLD: Edge Function
    const response = await supabase.functions.invoke('manage-tenants', {
      body: {
        action: 'create',
        tenant_data: tenantData,
      },
    });

    if (response.error) throw response.error;
    return response.data;
  }
}

/**
 * Delete a tenant
 */
export async function deleteTenant(tenantId: string) {
  if (USE_API_GATEWAY) {
    // NEW: API Gateway
    return adminApi.deleteTenant(tenantId);
  } else {
    // OLD: Edge Function
    const response = await supabase.functions.invoke('manage-tenants', {
      body: {
        action: 'delete',
        tenant_data: { id: tenantId },
      },
    });

    if (response.error) throw response.error;
    return response.data;
  }
}

/**
 * Assign user to tenant
 */
export async function assignUserToTenant(userId: string, tenantId: string) {
  if (USE_API_GATEWAY) {
    // NEW: API Gateway
    return adminApi.assignUserToTenant({ user_id: userId, tenant_id: tenantId });
  } else {
    // OLD: Edge Function
    const response = await supabase.functions.invoke('manage-tenants', {
      body: {
        action: 'assign_user',
        tenant_data: { user_id: userId, tenant_id: tenantId },
      },
    });

    if (response.error) throw response.error;
    return response.data;
  }
}

// ============================================================================
// TENANT SETTINGS OPERATIONS
// ============================================================================

/**
 * Get tenant settings
 */
export async function getTenantSettings(tenantId: string) {
  if (USE_API_GATEWAY) {
    // NEW: API Gateway
    return adminApi.getTenantSettings(tenantId);
  } else {
    // OLD: Edge Function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
    }

    const response = await supabase.functions.invoke('manage-tenant-settings', {
      body: {
        action: 'get',
        tenant_id: tenantId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) throw response.error;
    return response.data;
  }
}

/**
 * Update tenant settings
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: adminApi.UpdateTenantSettingsInput
) {
  if (USE_API_GATEWAY) {
    // NEW: API Gateway
    return adminApi.updateTenantSettings(tenantId, settings);
  } else {
    // OLD: Edge Function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
    }

    const { credentials, ...settingsOnly } = settings;

    const response = await supabase.functions.invoke('manage-tenant-settings', {
      body: {
        action: 'update',
        tenant_id: tenantId,
        settings: settingsOnly,
        credentials,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) throw response.error;
    return response.data;
  }
}
