/**
 * @fileoverview Campaigns Routes
 * @description HTTP routes for campaigns (READ operations only for Phase 5)
 * Campaign mutations (send-campaign) remain as separate Edge Functions
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as campaignsService from '../services/campaigns.service.ts';

export const campaignsRoutes = new Hono();

/**
 * GET /api/campaigns
 * Get paginated list of campaigns with filters
 *
 * Query params:
 * - channel: 'whatsapp' | 'llamadas' (optional)
 * - status: 'pending' | 'in_progress' | 'completed' | 'failed' (optional)
 * - page: number (optional, default: 1)
 * - pageSize: number (optional, default: 50)
 *
 * Response:
 * {
 *   campaigns: Campaign[],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   totalPages: number
 * }
 */
campaignsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  // Parse query params
  const channel = c.req.query('channel') as campaignsService.CampaignChannel | undefined;
  const status = c.req.query('status') as campaignsService.CampaignStatus | undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '50');

  // Build filters
  const filters: campaignsService.CampaignFilters = {};
  if (channel) filters.channel = channel;
  if (status) filters.status = status;

  const result = await campaignsService.listCampaigns(
    supabaseClient,
    userScope,
    filters,
    page,
    pageSize
  );

  return c.json(result);
});

/**
 * GET /api/campaigns/:id
 * Get a single campaign by ID
 *
 * Response: Campaign or 404
 */
campaignsRoutes.get('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const campaign = await campaignsService.getCampaignById(
    supabaseClient,
    userScope,
    id
  );

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  return c.json(campaign);
});

/**
 * GET /api/campaigns/:id/batches
 * Get campaign batches (queue entries)
 *
 * Response: CampaignBatch[]
 */
campaignsRoutes.get('/:id/batches', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const batches = await campaignsService.getCampaignBatches(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ batches });
});

/**
 * GET /api/campaigns/:id/contacts
 * Get campaign contacts with batch information
 *
 * Response:
 * {
 *   contacts: CampaignContactWithBatch[]
 * }
 */
campaignsRoutes.get('/:id/contacts', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const contacts = await campaignsService.getCampaignContacts(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ contacts });
});
