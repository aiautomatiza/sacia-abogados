/**
 * @fileoverview Contact Statuses Routes
 * @description HTTP routes for managing contact statuses
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as contactStatusesService from '../services/contact-statuses.service.ts';
import {
  createContactStatusSchema,
  updateContactStatusSchema,
  reorderContactStatusesSchema,
  updateContactStatusAssignmentSchema,
  uuidParamSchema,
} from '../utils/validation.ts';

export const contactStatusesRoutes = new Hono();

/**
 * GET /api/contact-statuses
 * Get list of contact statuses for the current tenant
 *
 * Query params:
 * - is_active: boolean (optional) - Filter by active/inactive status
 * - include_usage_count: boolean (optional) - Include contact count for each status
 *
 * Response:
 * {
 *   data: ContactStatusWithUsageCount[]
 * }
 */
contactStatusesRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const isActiveParam = c.req.query('is_active');
  const includeUsageCountParam = c.req.query('include_usage_count');

  const filters: contactStatusesService.ContactStatusFilters = {};

  if (isActiveParam !== undefined) {
    filters.is_active = isActiveParam === 'true';
  }

  if (includeUsageCountParam !== undefined) {
    filters.include_usage_count = includeUsageCountParam === 'true';
  }

  const statuses = await contactStatusesService.getContactStatuses(
    supabaseClient,
    userScope,
    filters
  );

  return c.json({ data: statuses });
});

/**
 * GET /api/contact-statuses/recent-changes
 * Get recent status changes across all contacts
 * Note: This route must be BEFORE /:id to avoid conflicts
 *
 * Query params:
 * - limit: number (default: 10, max: 100)
 *
 * Response:
 * {
 *   data: ContactStatusHistory[]
 * }
 */
contactStatusesRoutes.get('/recent-changes', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const limitParam = c.req.query('limit') || '10';
  const limit = Math.min(parseInt(limitParam), 100);

  const changes = await contactStatusesService.getRecentStatusChanges(
    supabaseClient,
    userScope,
    limit
  );

  return c.json({ data: changes });
});

/**
 * GET /api/contact-statuses/:id
 * Get a single contact status by ID
 */
contactStatusesRoutes.get('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  // Validate UUID format
  const validationResult = uuidParamSchema.safeParse(id);
  if (!validationResult.success) {
    return c.json(
      { error: 'Invalid ID format', details: validationResult.error.issues },
      400
    );
  }

  const status = await contactStatusesService.getContactStatus(
    supabaseClient,
    userScope,
    id
  );

  return c.json(status);
});

/**
 * POST /api/contact-statuses
 * Create a new contact status
 *
 * Request body:
 * {
 *   name: string (required)
 *   color: string (required, hex color)
 *   icon?: string | null
 *   is_default?: boolean
 * }
 *
 * Features:
 * - Automatically assigns next display_order
 * - Sets is_active = true by default
 * - Trigger ensures only one default status per tenant
 */
contactStatusesRoutes.post(
  '/',
  zValidator('json', createContactStatusSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const data = c.req.valid('json');

    const status = await contactStatusesService.createContactStatus(
      supabaseClient,
      userScope,
      data
    );

    return c.json(status, 201);
  }
);

/**
 * PATCH /api/contact-statuses/:id
 * Update an existing contact status
 *
 * Request body (all fields optional):
 * {
 *   name?: string
 *   color?: string
 *   icon?: string | null
 *   is_default?: boolean
 * }
 */
contactStatusesRoutes.patch(
  '/:id',
  zValidator('json', updateContactStatusSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    // Validate UUID format
    const validationResult = uuidParamSchema.safeParse(id);
    if (!validationResult.success) {
      return c.json(
        { error: 'Invalid ID format', details: validationResult.error.issues },
        400
      );
    }

    const status = await contactStatusesService.updateContactStatus(
      supabaseClient,
      userScope,
      id,
      updates
    );

    return c.json(status);
  }
);

/**
 * DELETE /api/contact-statuses/:id
 * Soft delete a contact status (sets is_active = false)
 * Preserves foreign key relationships and history
 */
contactStatusesRoutes.delete('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  // Validate UUID format
  const validationResult = uuidParamSchema.safeParse(id);
  if (!validationResult.success) {
    return c.json(
      { error: 'Invalid ID format', details: validationResult.error.issues },
      400
    );
  }

  await contactStatusesService.deleteContactStatus(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ success: true });
});

/**
 * POST /api/contact-statuses/reorder
 * Reorder contact statuses by updating display_order
 *
 * Request body:
 * {
 *   statuses: Array<{ id: string, display_order: number }>
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
contactStatusesRoutes.post(
  '/reorder',
  zValidator('json', reorderContactStatusesSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const { statuses } = c.req.valid('json');

    await contactStatusesService.reorderContactStatuses(
      supabaseClient,
      userScope,
      statuses
    );

    return c.json({ success: true });
  }
);

/**
 * GET /api/contacts/:contactId/status-history
 * Get status change history for a specific contact
 *
 * Response:
 * {
 *   data: ContactStatusHistory[]
 * }
 */
contactStatusesRoutes.get('/contacts/:contactId/status-history', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const contactId = c.req.param('contactId');

  // Validate UUID format
  const validationResult = uuidParamSchema.safeParse(contactId);
  if (!validationResult.success) {
    return c.json(
      { error: 'Invalid contact ID format', details: validationResult.error.issues },
      400
    );
  }

  const history = await contactStatusesService.getContactStatusHistory(
    supabaseClient,
    userScope,
    contactId
  );

  return c.json({ data: history });
});

/**
 * PATCH /api/contacts/:contactId/status
 * Update the status assignment for a contact
 * Creates history entry automatically via database trigger
 *
 * Request body:
 * {
 *   status_id: string | null
 * }
 */
contactStatusesRoutes.patch(
  '/contacts/:contactId/status',
  zValidator('json', updateContactStatusAssignmentSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const contactId = c.req.param('contactId');
    const { status_id } = c.req.valid('json');

    // Validate contact ID UUID format
    const validationResult = uuidParamSchema.safeParse(contactId);
    if (!validationResult.success) {
      return c.json(
        { error: 'Invalid contact ID format', details: validationResult.error.issues },
        400
      );
    }

    await contactStatusesService.updateContactStatusAssignment(
      supabaseClient,
      userScope,
      contactId,
      status_id
    );

    return c.json({ success: true });
  }
);
