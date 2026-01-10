/**
 * @fileoverview Admin Service Layer
 * @description Business logic for admin operations (super admin only)
 * Phase 7: Tenant CRUD and Settings management
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
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
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInput {
  name: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateTenantSettingsInput {
  whatsapp_enabled?: boolean;
  whatsapp_webhook_url?: string | null;
  calls_enabled?: boolean;
  calls_webhook_url?: string | null;
  calls_phone_number?: string | null;
  conversations_enabled?: boolean;
  conversations_webhook_url?: string | null;
}

export interface TenantCredentials {
  whatsapp?: Record<string, any>;
  calls?: Record<string, any>;
  conversations?: Record<string, any>;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

// ============================================================================
// SUPER ADMIN VERIFICATION
// ============================================================================

/**
 * Verify user is super admin
 * Throws if not authorized
 */
export async function verifySuperAdmin(
  supabaseClient: SupabaseClient,
  userScope: UserScope
): Promise<void> {
  if (userScope.isSuperAdmin) {
    return; // Already verified in auth middleware
  }

  throw new Error('No autorizado - requiere rol superAdmin');
}

// ============================================================================
// TENANT OPERATIONS
// ============================================================================

/**
 * List all tenants with settings and user count
 * Super admin only
 */
export async function listTenants(
  adminClient: SupabaseClient,
  userScope: UserScope
): Promise<Tenant[]> {
  await verifySuperAdmin(adminClient, userScope);

  const { data, error } = await adminClient
    .from('tenants')
    .select(`
      *,
      tenant_settings(*),
      profiles!profiles_tenant_id_fkey(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list tenants: ${error.message}`);
  }

  return (data || []) as Tenant[];
}

/**
 * Create a new tenant with default settings
 * Super admin only
 */
export async function createTenant(
  adminClient: SupabaseClient,
  userScope: UserScope,
  tenantData: CreateTenantInput
): Promise<Tenant> {
  await verifySuperAdmin(adminClient, userScope);

  // Create tenant
  const { data: newTenant, error: tenantError } = await adminClient
    .from('tenants')
    .insert(tenantData)
    .select()
    .single();

  if (tenantError) {
    throw new Error(`Failed to create tenant: ${tenantError.message}`);
  }

  // Create default settings
  const { error: settingsError } = await adminClient
    .from('tenant_settings')
    .insert({
      tenant_id: newTenant.id,
      whatsapp_enabled: false,
      calls_enabled: false,
      conversations_enabled: false,
    });

  if (settingsError) {
    throw new Error(`Failed to create tenant settings: ${settingsError.message}`);
  }

  console.log('[ADMIN] Tenant created:', newTenant.id);

  return newTenant as Tenant;
}

/**
 * Delete a tenant (CASCADE will delete everything)
 * Super admin only
 */
export async function deleteTenant(
  adminClient: SupabaseClient,
  userScope: UserScope,
  tenantId: string
): Promise<void> {
  await verifySuperAdmin(adminClient, userScope);

  const { error } = await adminClient
    .from('tenants')
    .delete()
    .eq('id', tenantId);

  if (error) {
    throw new Error(`Failed to delete tenant: ${error.message}`);
  }

  console.log('[ADMIN] Tenant deleted:', tenantId);
}

/**
 * Assign user to a tenant
 * Super admin only
 */
export async function assignUserToTenant(
  adminClient: SupabaseClient,
  userScope: UserScope,
  userId: string,
  tenantId: string
): Promise<void> {
  await verifySuperAdmin(adminClient, userScope);

  const { error } = await adminClient
    .from('profiles')
    .update({ tenant_id: tenantId })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to assign user to tenant: ${error.message}`);
  }

  console.log('[ADMIN] User assigned to tenant:', { userId, tenantId });
}

// ============================================================================
// TENANT SETTINGS OPERATIONS
// ============================================================================

/**
 * Get tenant settings
 * Super admin only
 */
export async function getTenantSettings(
  adminClient: SupabaseClient,
  userScope: UserScope,
  tenantId: string
): Promise<TenantSettings> {
  await verifySuperAdmin(adminClient, userScope);

  const { data, error } = await adminClient
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    throw new Error(`Failed to get tenant settings: ${error.message}`);
  }

  return data as TenantSettings;
}

/**
 * Update tenant settings with validation
 * Super admin only
 */
export async function updateTenantSettings(
  adminClient: SupabaseClient,
  userScope: UserScope,
  tenantId: string,
  settings: UpdateTenantSettingsInput,
  credentials?: TenantCredentials
): Promise<TenantSettings> {
  await verifySuperAdmin(adminClient, userScope);

  // Validate settings
  if (settings.whatsapp_enabled && !settings.whatsapp_webhook_url) {
    throw new Error('WhatsApp webhook URL es obligatorio cuando el canal está habilitado');
  }

  if (settings.whatsapp_webhook_url && !isValidUrl(settings.whatsapp_webhook_url)) {
    throw new Error('WhatsApp webhook URL debe ser HTTPS válido');
  }

  if (settings.calls_enabled && !settings.calls_webhook_url) {
    throw new Error('Webhook URL de llamadas es obligatorio cuando el canal está habilitado');
  }

  if (settings.calls_webhook_url && !isValidUrl(settings.calls_webhook_url)) {
    throw new Error('Webhook URL de llamadas debe ser HTTPS válido');
  }

  if (settings.calls_enabled && !settings.calls_phone_number) {
    throw new Error('Número de teléfono es obligatorio cuando las llamadas están habilitadas');
  }

  if (settings.calls_phone_number && !isValidPhoneNumber(settings.calls_phone_number)) {
    throw new Error('Número de teléfono inválido (formato E.164: +[código país][número])');
  }

  if (settings.conversations_enabled && !settings.conversations_webhook_url) {
    throw new Error('Webhook URL de conversaciones es obligatorio cuando el canal está habilitado');
  }

  if (settings.conversations_webhook_url && !isValidUrl(settings.conversations_webhook_url)) {
    throw new Error('Webhook URL de conversaciones debe ser HTTPS válido');
  }

  // Update tenant settings
  const { data, error } = await adminClient
    .from('tenant_settings')
    .update(settings)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update tenant settings: ${error.message}`);
  }

  // Store credentials if provided (using secrets storage)
  if (credentials) {
    // Note: Credential storage would need a separate implementation
    // using Supabase Vault or similar secure storage
    // For now, we'll log and skip this functionality
    if (credentials.whatsapp) {
      console.log('[ADMIN] WhatsApp credential storage requested for tenant:', tenantId);
      // TODO: Implement storeCredential function when Vault is available
    }
    if (credentials.calls) {
      console.log('[ADMIN] Calls credential storage requested for tenant:', tenantId);
    }
    if (credentials.conversations) {
      console.log('[ADMIN] Conversations credential storage requested for tenant:', tenantId);
    }
  }

  console.log('[ADMIN] Tenant settings updated:', tenantId);

  return data as TenantSettings;
}
