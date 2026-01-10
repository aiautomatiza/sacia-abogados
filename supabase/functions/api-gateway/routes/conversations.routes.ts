/**
 * @fileoverview Conversations Routes
 * @description HTTP routes for conversations (READ operations only for Phase 3)
 * Phase 4 will add mutation routes (POST, PATCH, DELETE)
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as conversationsService from '../services/conversations.service.ts';
import { updateConversationSchema } from '../utils/validation.ts';

export const conversationsRoutes = new Hono();

/**
 * GET /api/conversations
 * Get paginated list of conversations with filters
 *
 * Query params:
 * - channel: 'whatsapp' | 'instagram' | 'webchat' | 'email' (optional)
 * - status: 'active' | 'archived' | 'pending' | 'closed' (optional)
 * - assigned_to: string UUID or 'null' for unassigned (optional)
 * - tags: comma-separated tag IDs (optional)
 * - search: string (optional) - searches contact name/number
 * - unread_only: 'true' | 'false' (optional)
 * - pending_response_only: 'true' | 'false' (optional)
 * - whatsapp_number_id: string UUID (optional)
 * - sort_by: 'last_message' | 'created_at' | 'unread_first' | 'name' (optional, default: 'last_message')
 * - sort_order: 'asc' | 'desc' (optional, default: 'desc')
 * - page: number (optional, default: 1)
 * - pageSize: number (optional, default: 50)
 *
 * Response:
 * {
 *   conversations: ConversationWithContact[],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   totalPages: number
 * }
 */
conversationsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  // Parse query params
  const channel = c.req.query('channel') as conversationsService.ConversationChannel | undefined;
  const status = c.req.query('status') as conversationsService.ConversationStatus | undefined;
  const assignedToParam = c.req.query('assigned_to');
  const tagsParam = c.req.query('tags');
  const search = c.req.query('search');
  const unreadOnly = c.req.query('unread_only') === 'true';
  const pendingResponseOnly = c.req.query('pending_response_only') === 'true';
  const whatsappNumberId = c.req.query('whatsapp_number_id');
  const sortBy = c.req.query('sort_by') as 'last_message' | 'created_at' | 'unread_first' | 'name' | undefined;
  const sortOrder = c.req.query('sort_order') as 'asc' | 'desc' | undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '50');

  // Build filters
  const filters: conversationsService.ConversationFilters = {};

  if (channel) filters.channel = channel;
  if (status) filters.status = status;
  if (assignedToParam !== undefined) {
    filters.assigned_to = assignedToParam === 'null' ? null : assignedToParam;
  }
  if (tagsParam) {
    filters.tags = tagsParam.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }
  if (search) filters.search = search;
  if (unreadOnly) filters.unread_only = true;
  if (pendingResponseOnly) filters.pending_response_only = true;
  if (whatsappNumberId) filters.whatsapp_number_id = whatsappNumberId;
  if (sortBy) filters.sort_by = sortBy;
  if (sortOrder) filters.sort_order = sortOrder;

  const result = await conversationsService.listConversations(
    supabaseClient,
    userScope,
    filters,
    page,
    pageSize
  );

  return c.json(result);
});

/**
 * GET /api/conversations/:id
 * Get a single conversation by ID
 *
 * Response: ConversationWithContact
 */
conversationsRoutes.get('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const conversation = await conversationsService.getConversationById(
    supabaseClient,
    userScope,
    id
  );

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json(conversation);
});

/**
 * GET /api/conversations/by-contact/:contactId
 * Get a conversation by contact ID
 * Useful for finding existing conversation when starting a new chat
 *
 * Response: ConversationWithContact or null
 */
conversationsRoutes.get('/by-contact/:contactId', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const contactId = c.req.param('contactId');

  const conversation = await conversationsService.getConversationByContactId(
    supabaseClient,
    userScope,
    contactId
  );

  if (!conversation) {
    return c.json({ conversation: null });
  }

  return c.json(conversation);
});

/**
 * GET /api/conversations/:conversationId/messages
 * Get paginated list of messages for a conversation
 *
 * Query params:
 * - page: number (optional, default: 1)
 * - pageSize: number (optional, default: 100)
 *
 * Response:
 * {
 *   messages: MessageWithSender[],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   totalPages: number
 * }
 */
conversationsRoutes.get('/:conversationId/messages', async (c) => {
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const conversationId = c.req.param('conversationId');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '100');

  const result = await conversationsService.listMessages(
    supabaseClient,
    conversationId,
    page,
    pageSize
  );

  return c.json(result);
});

// ============================================================================
// MUTATION ROUTES (Phase 4)
// ============================================================================

/**
 * PATCH /api/conversations/:id
 * Update a conversation (status, tags, assigned_to)
 *
 * Request body (all fields optional):
 * {
 *   status?: 'active' | 'archived' | 'pending' | 'closed'
 *   tags?: string[]
 *   assigned_to?: string | null
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
conversationsRoutes.patch(
  '/:id',
  zValidator('json', updateConversationSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    // Update status if provided
    if (updates.status !== undefined) {
      await conversationsService.updateConversationStatus(
        supabaseClient,
        userScope,
        id,
        updates.status
      );
    }

    // Update tags if provided
    if (updates.tags !== undefined) {
      await conversationsService.updateConversationTags(
        supabaseClient,
        userScope,
        id,
        updates.tags
      );
    }

    // Update assigned_to if provided
    if (updates.assigned_to !== undefined) {
      await conversationsService.assignConversation(
        supabaseClient,
        userScope,
        id,
        updates.assigned_to
      );
    }

    return c.json({ success: true });
  }
);

/**
 * POST /api/conversations/:id/read
 * Mark a conversation as read (unread_count = 0)
 *
 * Response:
 * {
 *   success: true
 * }
 */
conversationsRoutes.post('/:id/read', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  await conversationsService.markAsRead(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ success: true });
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation
 *
 * Response:
 * {
 *   success: true
 * }
 */
conversationsRoutes.delete('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  await conversationsService.deleteConversation(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ success: true });
});
