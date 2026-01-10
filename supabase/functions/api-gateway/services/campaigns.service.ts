/**
 * @fileoverview Campaigns Service Layer
 * @description Business logic for campaign operations (READ operations only)
 * Campaign mutations (send-campaign) remain as separate Edge Functions
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';

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
// CAMPAIGN QUERIES
// ============================================================================

/**
 * List campaigns with filters and pagination
 */
export async function listCampaigns(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  filters: CampaignFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<CampaignsResponse> {
  let query = supabaseClient
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', userScope.tenantId);

  // Apply filters
  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch campaigns: ${error.message}`);
  }

  const campaigns = (data || []).map((c) => ({
    ...c,
    channel: c.channel as CampaignChannel,
    status: c.status as CampaignStatus,
  }));

  return {
    campaigns,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get a single campaign by ID
 */
export async function getCampaignById(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  campaignId: string
): Promise<Campaign | null> {
  const { data, error } = await supabaseClient
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('tenant_id', userScope.tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }

  // Defense in depth: Verify tenant isolation
  if (data.tenant_id !== userScope.tenantId && !userScope.isSuperAdmin) {
    console.error('[SECURITY] Tenant violation in getCampaignById:', {
      userId: userScope.userId,
      userTenantId: userScope.tenantId,
      resourceTenantId: data.tenant_id,
    });
    throw new Error('Access denied');
  }

  return {
    ...data,
    channel: data.channel as CampaignChannel,
    status: data.status as CampaignStatus,
  };
}

/**
 * Get campaign batches (queue entries)
 */
export async function getCampaignBatches(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  campaignId: string
): Promise<CampaignBatch[]> {
  // First verify campaign exists and user has access
  const campaign = await getCampaignById(supabaseClient, userScope, campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const { data, error } = await supabaseClient
    .from('campaign_queue')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('batch_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch campaign batches: ${error.message}`);
  }

  return (data || []).map((b) => ({
    ...b,
    status: b.status as CampaignBatchStatus,
    contacts: b.contacts as any as CampaignContact[],
  }));
}

/**
 * Get campaign contacts with batch information
 */
export async function getCampaignContacts(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  campaignId: string
): Promise<CampaignContactWithBatch[]> {
  const batches = await getCampaignBatches(supabaseClient, userScope, campaignId);

  return batches.flatMap((batch) =>
    (batch.contacts as any[]).map((contact: any) => ({
      id: contact.id,
      nombre: contact.nombre || null,
      numero: contact.numero,
      attributes: contact.attributes || {},
      batch_number: batch.batch_number,
      batch_status: batch.status,
      sent_at: batch.processed_at,
    }))
  );
}
