/**
 * @fileoverview Admin API Endpoints
 * @description Type-safe wrappers for Admin API Gateway endpoints (super admin only)
 * Phase 7: Tenant CRUD and Settings management
 */

import { apiRequest } from '../client';

// ============================================================================
// TYPES
// ============================================================================

export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
  tenant_settings?: TenantSettings[];
  profiles?: { count: number }[];
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  whatsapp_enabled: boolean;
  whatsapp_webhook_url: string | null;
  calls_enabled: boolean;
  calls_webhook_url: string | null;
  calls_phone_number: string | null;
  conversations_enabled: boolean;
  conversations_webhook_url: string | null;
  appointments_enabled: boolean;
  appointments_webhook_url: string | null;
  created_at: string;
  updated_at: string;
  // Note: credentials are never returned from API for security
}

export interface CreateTenantInput {
  name: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: TenantStatus;
}

export interface UpdateTenantSettingsInput {
  whatsapp_enabled?: boolean;
  whatsapp_webhook_url?: string | null;
  calls_enabled?: boolean;
  calls_webhook_url?: string | null;
  calls_phone_number?: string | null;
  conversations_enabled?: boolean;
  conversations_webhook_url?: string | null;
  appointments_enabled?: boolean;
  appointments_webhook_url?: string | null;
  credentials?: {
    whatsapp?: string | Record<string, any>;
    calls?: string | Record<string, any>;
    conversations?: string | Record<string, any>;
    appointments?: string | Record<string, any>;
  };
}

export interface AssignUserToTenantInput {
  user_id: string;
  tenant_id: string;
}

// ============================================================================
// TENANT ENDPOINTS
// ============================================================================

/**
 * List all tenants with settings and user count
 * Super admin only
 *
 * @returns Array of tenants
 */
export async function getTenants(): Promise<{ data: Tenant[] }> {
  return apiRequest<{ data: Tenant[] }>('/api/admin/tenants', {
    method: 'GET',
  });
}

/**
 * Create a new tenant with default settings
 * Super admin only
 *
 * @param tenantData - Tenant data
 * @returns Created tenant
 */
export async function createTenant(tenantData: CreateTenantInput): Promise<Tenant> {
  return apiRequest<Tenant>('/api/admin/tenants', {
    method: 'POST',
    body: tenantData,
  });
}

/**
 * Delete a tenant (CASCADE will delete everything)
 * Super admin only
 *
 * @param tenantId - Tenant ID
 * @returns Success response
 */
export async function deleteTenant(tenantId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/admin/tenants/${tenantId}`, {
    method: 'DELETE',
  });
}

/**
 * Assign a user to a tenant
 * Super admin only
 *
 * @param data - User and tenant IDs
 * @returns Success response
 */
export async function assignUserToTenant(
  data: AssignUserToTenantInput
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/api/admin/tenants/assign-user', {
    method: 'POST',
    body: data,
  });
}

// ============================================================================
// TENANT SETTINGS ENDPOINTS
// ============================================================================

/**
 * Get tenant settings
 * Super admin only
 *
 * @param tenantId - Tenant ID
 * @returns Tenant settings
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  return apiRequest<TenantSettings>(`/api/admin/tenant-settings/${tenantId}`, {
    method: 'GET',
  });
}

/**
 * Update tenant settings with validation
 * Super admin only
 *
 * @param tenantId - Tenant ID
 * @param settings - Settings to update
 * @returns Updated tenant settings
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: UpdateTenantSettingsInput
): Promise<TenantSettings> {
  return apiRequest<TenantSettings>(`/api/admin/tenant-settings/${tenantId}`, {
    method: 'PATCH',
    body: settings,
  });
}
