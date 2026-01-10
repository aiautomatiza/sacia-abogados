/**
 * @fileoverview Integrations Routes
 * @description HTTP routes for integrations (Phase 6)
 * OAuth operations remain as separate Edge Functions (initiate-oauth, handle-oauth-callback)
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as integrationsService from '../services/integrations.service.ts';
import { updateSyncSettingsSchema } from '../utils/validation.ts';

export const integrationsRoutes = new Hono();

/**
 * GET /api/integrations
 * Get all integrations for the current tenant with sync settings
 *
 * Response:
 * {
 *   data: Integration[]
 * }
 */
integrationsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const integrations = await integrationsService.listIntegrations(
    supabaseClient,
    userScope
  );

  return c.json({ data: integrations });
});

/**
 * GET /api/integrations/:id
 * Get a single integration by ID
 *
 * Response: Integration or 404
 */
integrationsRoutes.get('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const integration = await integrationsService.getIntegrationById(
    supabaseClient,
    userScope,
    id
  );

  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  return c.json(integration);
});

/**
 * PATCH /api/integrations/:id/sync-settings
 * Update sync settings for an integration
 *
 * Request body (all fields optional):
 * {
 *   enabled?: boolean
 *   sync_frequency?: 'manual' | 'hourly' | 'daily'
 *   field_mappings?: Record<string, string>
 * }
 *
 * Response: IntegrationSyncSettings
 */
integrationsRoutes.patch(
  '/:id/sync-settings',
  zValidator('json', updateSyncSettingsSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const id = c.req.param('id');
    const settings = c.req.valid('json');

    const updatedSettings = await integrationsService.updateSyncSettings(
      supabaseClient,
      userScope,
      id,
      settings
    );

    return c.json(updatedSettings);
  }
);

/**
 * DELETE /api/integrations/:id
 * Disconnect (delete) an integration
 * Also attempts to revoke OAuth tokens via middleware
 *
 * Response:
 * {
 *   success: true
 * }
 */
integrationsRoutes.delete('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  // Get middleware URL and access token from env/context if available
  const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');

  // Get access token from Authorization header
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  await integrationsService.disconnectIntegration(
    supabaseClient,
    userScope,
    id,
    middlewareUrl,
    accessToken
  );

  return c.json({ success: true });
});
