/**
 * @fileoverview Campaigns API Endpoints
 * @description Type-safe wrappers for Campaigns API Gateway endpoints
 * Phase 5: Queries (GET)
 */

import { apiRequest } from '../client';

// ============================================================================
// TYPES
// ============================================================================

export type CampaignChannel = 'whatsapp' | 'llamadas';
export type CampaignStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type CampaignBatchStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface Campaign {
  id: string;
  tenant_id: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  total_contacts: number;
  total_batches: number;
  batches_sent: number;
  batches_failed: number;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  updated_at: string | null;
}

export interface CampaignBatch {
  id: string;
  campaign_id: string;
  batch_number: number;
  total_batches: number;
  status: CampaignBatchStatus;
  scheduled_for: string;
  processed_at: string | null;
  contacts: CampaignContact[];
}

export interface CampaignContact {
  id: string;
  nombre: string | null;
  numero: string;
  attributes: Record<string, any>;
}

export interface CampaignContactWithBatch extends CampaignContact {
  batch_number: number;
  batch_status: string;
  sent_at: string | null;
}

export interface CampaignFilters {
  channel?: CampaignChannel;
  status?: CampaignStatus;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// QUERY ENDPOINTS
// ============================================================================

/**
 * Get paginated list of campaigns with filters
 *
 * @param filters - Filter criteria
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated campaigns response
 */
export async function getCampaigns(
  filters: CampaignFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<CampaignsResponse> {
  const params: Record<string, string> = {
    page: page.toString(),
    pageSize: pageSize.toString(),
  };

  // Add filter params
  if (filters.channel) {
    params.channel = filters.channel;
  }
  if (filters.status) {
    params.status = filters.status;
  }

  return apiRequest<CampaignsResponse>('/api/campaigns', {
    method: 'GET',
    params,
  });
}

/**
 * Get a single campaign by ID
 *
 * @param campaignId - Campaign ID
 * @returns Campaign data
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/api/campaigns/${campaignId}`, {
    method: 'GET',
  });
}

/**
 * Get campaign batches (queue entries)
 *
 * @param campaignId - Campaign ID
 * @returns Array of campaign batches
 */
export async function getCampaignBatches(
  campaignId: string
): Promise<{ batches: CampaignBatch[] }> {
  return apiRequest<{ batches: CampaignBatch[] }>(
    `/api/campaigns/${campaignId}/batches`,
    {
      method: 'GET',
    }
  );
}

/**
 * Get campaign contacts with batch information
 *
 * @param campaignId - Campaign ID
 * @returns Array of campaign contacts with batch data
 */
export async function getCampaignContacts(
  campaignId: string
): Promise<{ contacts: CampaignContactWithBatch[] }> {
  return apiRequest<{ contacts: CampaignContactWithBatch[] }>(
    `/api/campaigns/${campaignId}/contacts`,
    {
      method: 'GET',
    }
  );
}
