/**
 * @fileoverview Contacts Routes
 * @description HTTP routes for managing contacts
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as contactsService from '../services/contacts.service.ts';
import {
  createContactSchema,
  updateContactSchema,
  bulkDeleteSchema,
  uuidParamSchema,
} from '../utils/validation.ts';

export const contactsRoutes = new Hono();

/**
 * GET /api/contacts
 * Get paginated list of contacts for the current tenant
 *
 * Query params:
 * - search: string (optional) - Search by phone number or name
 * - status_ids: string (optional) - Comma-separated list of status IDs to filter by
 * - page: number (default: 1)
 * - pageSize: number (default: 30)
 *
 * Response:
 * {
 *   data: Contact[],
 *   meta: { page, pageSize, total, totalPages }
 * }
 */
contactsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const search = c.req.query('search') || '';
  const statusIdsParam = c.req.query('status_ids') || '';
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '30');

  // Parse status_ids from comma-separated string
  const status_ids = statusIdsParam
    ? statusIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0)
    : undefined;

  const result = await contactsService.getContacts(
    supabaseClient,
    userScope,
    { search, status_ids },
    page,
    pageSize
  );

  return c.json({
    data: result.data,
    meta: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
});

/**
 * GET /api/contacts/:id
 * Get a single contact by ID
 */
contactsRoutes.get('/:id', async (c) => {
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

  const contact = await contactsService.getContact(
    supabaseClient,
    userScope,
    id
  );

  return c.json(contact);
});

/**
 * POST /api/contacts
 * Create a new contact
 *
 * Request body:
 * {
 *   numero: string (required)
 *   nombre?: string
 *   attributes?: Record<string, any>
 *   skip_external_sync?: boolean
 * }
 *
 * Features:
 * - Normalizes phone number to E.164 format (Spanish numbers)
 * - Checks for duplicates (tenant + numero)
 * - Notifies external middleware if tenant has active integrations
 */
contactsRoutes.post(
  '/',
  zValidator('json', createContactSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const authHeader = c.req.header('Authorization') || '';
    const data = c.req.valid('json');

    const contact = await contactsService.createContact(
      supabaseClient,
      userScope,
      data,
      authHeader
    );

    return c.json(contact, 201);
  }
);

/**
 * PATCH /api/contacts/:id
 * Update an existing contact
 *
 * Request body (all fields optional):
 * {
 *   numero?: string
 *   nombre?: string
 *   attributes?: Record<string, any>
 * }
 */
contactsRoutes.patch(
  '/:id',
  zValidator('json', updateContactSchema),
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

    const contact = await contactsService.updateContact(
      supabaseClient,
      userScope,
      id,
      updates
    );

    return c.json(contact);
  }
);

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
contactsRoutes.delete('/:id', async (c) => {
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

  await contactsService.deleteContact(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ success: true });
});

/**
 * POST /api/contacts/bulk-delete
 * Delete multiple contacts in bulk
 *
 * Request body:
 * {
 *   ids: string[] (1-100 UUIDs)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   deletedCount: number
 * }
 */
contactsRoutes.post(
  '/bulk-delete',
  zValidator('json', bulkDeleteSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const { ids } = c.req.valid('json');

    await contactsService.deleteContactsBulk(
      supabaseClient,
      userScope,
      ids
    );

    return c.json({
      success: true,
      deletedCount: ids.length,
    });
  }
);
