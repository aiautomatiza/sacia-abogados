/**
 * @fileoverview Integrations Service Layer
 * @description Business logic for integration operations
 * Phase 6: Queries (GET) + Mutations (PATCH, DELETE)
 * OAuth operations remain as separate Edge Functions (initiate-oauth, handle-oauth-callback)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';

// ============================================================================
// TYPES
// ============================================================================

export type IntegrationStatus = 'pending' | 'active' | 'expired' | 'error';
export type SyncFrequency = 'manual' | 'hourly' | 'daily';

export interface Integration {
  id: string;
  tenant_id: string;
  integration_name: string;
  integration_type: string;
  status: IntegrationStatus;
  provider_user_id: string | null;
  provider_account_name: string | null;
  scopes: string[] | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  integration_sync_settings?: IntegrationSyncSettings[];
}

export interface IntegrationSyncSettings {
  id: string;
  integration_id: string;
  enabled: boolean;
  sync_frequency: SyncFrequency;
  field_mappings: Record<string, string>;
  sync_filters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UpdateSyncSettingsParams {
  enabled?: boolean;
  sync_frequency?: SyncFrequency;
  field_mappings?: Record<string, string>;
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * List integrations for a tenant with sync settings
 */
export async function listIntegrations(
  supabaseClient: SupabaseClient,
  userScope: UserScope
): Promise<Integration[]> {
  const { data, error } = await supabaseClient
    .from('integration_credentials')
    .select('*, integration_sync_settings(*)')
    .eq('tenant_id', userScope.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch integrations: ${error.message}`);
  }

  return (data || []) as Integration[];
}

/**
 * Get a single integration by ID
 */
export async function getIntegrationById(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  integrationId: string
): Promise<Integration | null> {
  const { data, error } = await supabaseClient
    .from('integration_credentials')
    .select('*, integration_sync_settings(*)')
    .eq('id', integrationId)
    .eq('tenant_id', userScope.tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch integration: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Defense in depth: Verify tenant isolation
  if (data.tenant_id !== userScope.tenantId && !userScope.isSuperAdmin) {
    console.error('[SECURITY] Tenant violation in getIntegrationById:', {
      userId: userScope.userId,
      userTenantId: userScope.tenantId,
      resourceTenantId: data.tenant_id,
    });
    throw new Error('Access denied');
  }

  return data as Integration;
}

// ============================================================================
// MUTATION OPERATIONS
// ============================================================================

/**
 * Update sync settings for an integration
 */
export async function updateSyncSettings(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  integrationId: string,
  settings: UpdateSyncSettingsParams
): Promise<IntegrationSyncSettings> {
  // First verify integration exists and user has access
  const integration = await getIntegrationById(
    supabaseClient,
    userScope,
    integrationId
  );

  if (!integration) {
    throw new Error('Integration not found');
  }

  const { data, error } = await supabaseClient
    .from('integration_sync_settings')
    .update(settings)
    .eq('integration_id', integrationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update sync settings: ${error.message}`);
  }

  return data as IntegrationSyncSettings;
}

/**
 * Disconnect (delete) an integration
 * Also attempts to revoke OAuth tokens via middleware
 */
export async function disconnectIntegration(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  integrationId: string,
  middlewareUrl?: string,
  accessToken?: string
): Promise<void> {
  // Verify integration exists and belongs to user's tenant
  const integration = await getIntegrationById(
    supabaseClient,
    userScope,
    integrationId
  );

  if (!integration) {
    throw new Error('Integration not found');
  }

  // Attempt to revoke OAuth in middleware (optional, non-blocking)
  if (middlewareUrl && accessToken) {
    try {
      await fetch(`${middlewareUrl}/api/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          integration_id: integrationId,
          tenant_id: userScope.tenantId,
          integration_name: integration.integration_name,
        }),
      });
    } catch (error) {
      console.error('[WARN] Failed to revoke OAuth in middleware:', error);
      // Continue with deletion even if revoke fails
    }
  }

  // Delete integration from database
  const { error } = await supabaseClient
    .from('integration_credentials')
    .delete()
    .eq('id', integrationId)
    .eq('tenant_id', userScope.tenantId);

  if (error) {
    throw new Error(`Failed to disconnect integration: ${error.message}`);
  }
}
