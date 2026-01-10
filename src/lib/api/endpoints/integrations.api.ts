/**
 * @fileoverview Integrations API Endpoints
 * @description Type-safe wrappers for Integrations API Gateway endpoints
 * Phase 6: Queries (GET) + Mutations (PATCH, DELETE)
 */

import { apiRequest } from '../client';

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
// QUERY ENDPOINTS
// ============================================================================

/**
 * Get all integrations for the current tenant with sync settings
 *
 * @returns Array of integrations
 */
export async function getIntegrations(): Promise<{ data: Integration[] }> {
  return apiRequest<{ data: Integration[] }>('/api/integrations', {
    method: 'GET',
  });
}

/**
 * Get a single integration by ID
 *
 * @param integrationId - Integration ID
 * @returns Integration data
 */
export async function getIntegration(integrationId: string): Promise<Integration> {
  return apiRequest<Integration>(`/api/integrations/${integrationId}`, {
    method: 'GET',
  });
}

// ============================================================================
// MUTATION ENDPOINTS
// ============================================================================

/**
 * Update sync settings for an integration
 *
 * @param integrationId - Integration ID
 * @param settings - Settings to update
 * @returns Updated sync settings
 */
export async function updateSyncSettings(
  integrationId: string,
  settings: UpdateSyncSettingsParams
): Promise<IntegrationSyncSettings> {
  return apiRequest<IntegrationSyncSettings>(
    `/api/integrations/${integrationId}/sync-settings`,
    {
      method: 'PATCH',
      body: settings,
    }
  );
}

/**
 * Disconnect (delete) an integration
 * Also attempts to revoke OAuth tokens via middleware
 *
 * @param integrationId - Integration ID
 * @returns Success response
 */
export async function disconnectIntegration(
  integrationId: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/integrations/${integrationId}`, {
    method: 'DELETE',
  });
}
