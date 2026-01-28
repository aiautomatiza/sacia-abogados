/**
 * @fileoverview Conversations Service
 * @description Business logic for managing conversations (READ operations only for Phase 3)
 * Phase 4 will add mutations (update, delete, create)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';
import { ApiError } from '../types/shared.types.ts';
import { assertTenantAccess } from '../middleware/tenant-isolation.ts';

/**
 * Conversation channel types
 */
export type ConversationChannel = 'whatsapp' | 'instagram' | 'webchat' | 'email';

/**
 * Conversation status types
 */
export type ConversationStatus = 'active' | 'archived' | 'pending' | 'closed';

/**
 * Message content types
 */
export type MessageContentType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'template';

/**
 * Message sender types
 */
export type MessageSenderType = 'customer' | 'agent' | 'system' | 'bot';

/**
 * Contact status from CRM
 */
export interface ContactStatus {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

/**
 * Contact from CRM
 */
export interface Contact {
  id: string;
  nombre: string | null;
  numero: string;
  attributes: Record<string, any> | null;
  status_id: string | null;
  status: ContactStatus | null;
}

/**
 * WhatsApp number configuration
 */
export interface WhatsAppNumber {
  id: string;
  phone_number_id: string;
  phone_number: string;
  alias: string;
}

/**
 * Conversation with embedded contact
 */
export interface ConversationWithContact {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  state: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  tags: string[] | null;
  assigned_to: string | null;
  pending_agent_response: boolean;
  whatsapp_number_id: string | null;
  whatsapp_24h_window_expires_at: string | null;
  created_at: string;
  contact: Contact | null;
  whatsapp_number?: WhatsAppNumber | null;
}

/**
 * Message with sender info
 */
export interface MessageWithSender {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  content_type: MessageContentType;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  delivery_status: string;
  replied_to_message_id: string | null;
  created_at: string;
}

/**
 * Conversation tag
 */
export interface ConversationTag {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Filters for listing conversations
 */
export interface ConversationFilters {
  channel?: ConversationChannel;
  status?: ConversationStatus;
  assigned_to?: string | null;
  tags?: string[];
  search?: string;
  unread_only?: boolean;
  pending_response_only?: boolean;
  whatsapp_number_id?: string;
  sort_by?: 'last_message' | 'created_at' | 'unread_first' | 'name';
  sort_order?: 'asc' | 'desc';
}

/**
 * Response for list conversations
 */
export interface ConversationsResponse {
  conversations: ConversationWithContact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Response for list messages
 */
export interface MessagesResponse {
  messages: MessageWithSender[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Sanitizes a search term to prevent SQL injection
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_]/g, '\\$&');
}

/**
 * Lists conversations with filters, pagination, and search
 * Supports complex filtering by channel, status, tags, assigned user, and search by contact
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param filters - Filter criteria
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Conversations with contact info and pagination metadata
 */
export async function listConversations(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  filters: ConversationFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<ConversationsResponse> {
  console.log('[conversations] Listing conversations for tenant:', userScope.tenantId);

  const offset = (page - 1) * pageSize;
  const hasSearch = filters.search && filters.search.trim().length > 0;

  // If there's a search, first get matching contact IDs
  let matchingContactIds: string[] | null = null;

  if (hasSearch) {
    const sanitized = sanitizeSearchTerm(filters.search!.trim());
    const searchTerm = `%${sanitized}%`;

    const { data: matchingContacts, error: contactError } = await supabaseClient
      .from('crm_contacts')
      .select('id')
      .eq('tenant_id', userScope.tenantId)
      .or(`nombre.ilike.${searchTerm},numero.ilike.${searchTerm}`);

    if (contactError) {
      console.error('[conversations] Error searching contacts:', contactError);
      throw new ApiError(contactError.message, 500, 'DATABASE_ERROR');
    }

    matchingContactIds = matchingContacts?.map(c => c.id) || [];

    // If no matching contacts, return empty result
    if (matchingContactIds.length === 0) {
      return {
        conversations: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Build main query
  let query = supabaseClient
    .from('conversations')
    .select(
      `
      id,
      tenant_id,
      contact_id,
      channel,
      status,
      state,
      last_message_at,
      last_message_preview,
      unread_count,
      tags,
      assigned_to,
      pending_agent_response,
      whatsapp_number_id,
      whatsapp_24h_window_expires_at,
      created_at,
      contact:crm_contacts!conversations_contact_id_fkey (
        id,
        nombre,
        numero,
        status_id,
        status:crm_contact_statuses!crm_contacts_status_id_fkey (
          id,
          name,
          color,
          icon
        )
      ),
      whatsapp_number:whatsapp_numbers!conversations_whatsapp_number_id_fkey (
        id,
        phone_number_id,
        phone_number,
        alias
      )
      `,
      { count: 'exact' }
    )
    .eq('tenant_id', userScope.tenantId);

  // Apply search filter by contact_id
  if (matchingContactIds && matchingContactIds.length > 0) {
    query = query.in('contact_id', matchingContactIds);
  }

  // Apply filters
  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.assigned_to !== undefined) {
    if (filters.assigned_to === null) {
      query = query.is('assigned_to', null);
    } else {
      query = query.eq('assigned_to', filters.assigned_to);
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters.unread_only) {
    query = query.gt('unread_count', 0);
  }

  if (filters.pending_response_only) {
    query = query.eq('pending_agent_response', true);
  }

  if (filters.whatsapp_number_id) {
    query = query.eq('whatsapp_number_id', filters.whatsapp_number_id);
  }

  // Apply sorting
  const sortOrder = filters.sort_order === 'asc';

  switch (filters.sort_by) {
    case 'created_at':
      query = query.order('created_at', { ascending: sortOrder, nullsFirst: false });
      break;
    case 'unread_first':
      // Sort by unread_count desc first, then by last_message_at
      query = query.order('unread_count', { ascending: false });
      query = query.order('last_message_at', { ascending: false, nullsFirst: false });
      break;
    case 'name':
      // For name sorting, we'll need to sort client-side after fetching
      // because contact is an embedded relation
      query = query.order('last_message_at', { ascending: false, nullsFirst: false });
      break;
    case 'last_message':
    default:
      query = query.order('last_message_at', { ascending: sortOrder, nullsFirst: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[conversations] Error listing conversations:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  let conversations = (data as ConversationWithContact[]) || [];

  // Client-side sorting by name if needed
  if (filters.sort_by === 'name') {
    conversations = [...conversations].sort((a, b) => {
      const nameA = a.contact?.nombre?.toLowerCase() || '';
      const nameB = b.contact?.nombre?.toLowerCase() || '';
      const comparison = nameA.localeCompare(nameB);
      return sortOrder ? comparison : -comparison;
    });
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    conversations,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Gets a single conversation by ID
 * Validates tenant ownership
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param conversationId - Conversation ID
 * @returns Conversation with contact info or null if not found
 */
export async function getConversationById(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  conversationId: string
): Promise<ConversationWithContact | null> {
  console.log('[conversations] Getting conversation:', conversationId);

  const { data, error } = await supabaseClient
    .from('conversations')
    .select(
      `
      *,
      contact:crm_contacts!conversations_contact_id_fkey (
        id,
        nombre,
        numero,
        attributes,
        status_id,
        status:crm_contact_statuses!crm_contacts_status_id_fkey (
          id,
          name,
          color,
          icon
        )
      ),
      whatsapp_number:whatsapp_numbers!conversations_whatsapp_number_id_fkey (
        id,
        phone_number_id,
        phone_number,
        alias
      )
      `
    )
    .eq('id', conversationId)
    .eq('tenant_id', userScope.tenantId)
    .maybeSingle();

  if (error) {
    console.error('[conversations] Error getting conversation:', error);
    if (error.code === 'PGRST116') {
      throw new ApiError('Conversation not found or access denied', 404, 'NOT_FOUND');
    }
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  if (data) {
    // Defense in depth: validate tenant access
    assertTenantAccess(data.tenant_id, userScope, 'conversation');
  }

  return data as ConversationWithContact | null;
}

/**
 * Gets a conversation by contact ID
 * Useful for finding existing conversation when starting a new chat with a contact
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param contactId - Contact ID
 * @returns Conversation with contact info or null if not found
 */
export async function getConversationByContactId(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  contactId: string
): Promise<ConversationWithContact | null> {
  console.log('[conversations] Getting conversation by contact:', contactId);

  const { data, error } = await supabaseClient
    .from('conversations')
    .select(
      `
      *,
      contact:crm_contacts!conversations_contact_id_fkey (
        id,
        nombre,
        numero,
        attributes,
        status_id,
        status:crm_contact_statuses!crm_contacts_status_id_fkey (
          id,
          name,
          color,
          icon
        )
      ),
      whatsapp_number:whatsapp_numbers!conversations_whatsapp_number_id_fkey (
        id,
        phone_number_id,
        phone_number,
        alias
      )
      `
    )
    .eq('contact_id', contactId)
    .eq('tenant_id', userScope.tenantId)
    .maybeSingle();

  if (error) {
    console.error('[conversations] Error getting conversation by contact:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  if (data) {
    // Defense in depth: validate tenant access
    assertTenantAccess(data.tenant_id, userScope, 'conversation');
  }

  return data as ConversationWithContact | null;
}

/**
 * Lists messages for a conversation with pagination
 * Ordered by created_at descending (newest first)
 *
 * @param supabaseClient - Supabase client with user context
 * @param conversationId - Conversation ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Messages with pagination metadata
 */
export async function listMessages(
  supabaseClient: SupabaseClient,
  conversationId: string,
  page: number = 1,
  pageSize: number = 100
): Promise<MessagesResponse> {
  console.log('[conversations] Listing messages for conversation:', conversationId);

  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabaseClient
    .from('conversation_messages')
    .select(
      `
      id,
      conversation_id,
      sender_type,
      sender_id,
      content_type,
      content,
      file_url,
      file_name,
      file_type,
      file_size,
      delivery_status,
      replied_to_message_id,
      created_at
      `,
      { count: 'exact' }
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('[conversations] Error listing messages:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    messages: (data as MessageWithSender[]) || [],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Lists all tags for a tenant
 * Ordered alphabetically by name
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @returns Array of conversation tags
 */
export async function listTags(
  supabaseClient: SupabaseClient,
  userScope: UserScope
): Promise<ConversationTag[]> {
  console.log('[conversations] Listing tags for tenant:', userScope.tenantId);

  const { data, error } = await supabaseClient
    .from('conversation_tags')
    .select('*')
    .eq('tenant_id', userScope.tenantId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[conversations] Error listing tags:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return data || [];
}

// ============================================================================
// CONVERSATION MUTATIONS (Phase 4)
// ============================================================================

/**
 * Marks a conversation as read (sets unread_count to 0)
 * Updates the updated_at timestamp
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param conversationId - Conversation ID
 */
export async function markAsRead(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  conversationId: string
): Promise<void> {
  console.log('[conversations] Marking conversation as read:', conversationId);

  const { error } = await supabaseClient
    .from('conversations')
    .update({
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('tenant_id', userScope.tenantId);

  if (error) {
    console.error('[conversations] Error marking as read:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Updates conversation status
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param conversationId - Conversation ID
 * @param status - New status
 */
export async function updateConversationStatus(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  conversationId: string,
  status: ConversationStatus
): Promise<void> {
  console.log('[conversations] Updating status:', conversationId, status);

  const { error } = await supabaseClient
    .from('conversations')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('tenant_id', userScope.tenantId);

  if (error) {
    console.error('[conversations] Error updating status:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Updates conversation tags
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param conversationId - Conversation ID
 * @param tags - Array of tag IDs
 */
export async function updateConversationTags(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  conversationId: string,
  tags: string[]
): Promise<void> {
  console.log('[conversations] Updating tags:', conversationId, tags);

  const { error } = await supabaseClient
    .from('conversations')
    .update({
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('tenant_id', userScope.tenantId);

  if (error) {
    console.error('[conversations] Error updating tags:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Assigns a conversation to a user
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param conversationId - Conversation ID
 * @param userId - User ID to assign (null to unassign)
 */
export async function assignConversation(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  conversationId: string,
  userId: string | null
): Promise<void> {
  console.log('[conversations] Assigning conversation:', conversationId, userId);

  const { error } = await supabaseClient
    .from('conversations')
    .update({
      assigned_to: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('tenant_id', userScope.tenantId);

  if (error) {
    console.error('[conversations] Error assigning conversation:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Deletes a conversation
 * Validates tenant ownership before delete
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param conversationId - Conversation ID
 */
export async function deleteConversation(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  conversationId: string
): Promise<void> {
  console.log('[conversations] Deleting conversation:', conversationId);

  const { error } = await supabaseClient
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('tenant_id', userScope.tenantId);

  if (error) {
    console.error('[conversations] Error deleting conversation:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

// ============================================================================
// TAG MUTATIONS (Phase 4)
// ============================================================================

/**
 * Input for creating a tag
 */
export interface CreateTagInput {
  name: string;
  color?: string;
  icon?: string;
}

/**
 * Creates a new conversation tag
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param input - Tag data
 * @returns Created tag
 */
export async function createTag(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  input: CreateTagInput
): Promise<ConversationTag> {
  console.log('[conversations] Creating tag:', input.name);

  const { data, error } = await supabaseClient
    .from('conversation_tags')
    .insert({
      tenant_id: userScope.tenantId,
      name: input.name,
      color: input.color || null,
      icon: input.icon || null,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[conversations] Error creating tag:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return data;
}

/**
 * Updates a conversation tag
 * Only allows updating name, color, and icon
 * Cannot update system tags
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param tagId - Tag ID
 * @param updates - Partial tag updates
 */
export async function updateTag(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  tagId: string,
  updates: Partial<CreateTagInput>
): Promise<void> {
  console.log('[conversations] Updating tag:', tagId);

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.color !== undefined) {
    updateData.color = updates.color;
  }
  if (updates.icon !== undefined) {
    updateData.icon = updates.icon;
  }

  const { error } = await supabaseClient
    .from('conversation_tags')
    .update(updateData)
    .eq('id', tagId)
    .eq('tenant_id', userScope.tenantId)
    .eq('is_system', false); // Cannot update system tags

  if (error) {
    console.error('[conversations] Error updating tag:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Deletes a conversation tag
 * Only allows deleting non-system tags
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param tagId - Tag ID
 */
export async function deleteTag(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  tagId: string
): Promise<void> {
  console.log('[conversations] Deleting tag:', tagId);

  const { error } = await supabaseClient
    .from('conversation_tags')
    .delete()
    .eq('id', tagId)
    .eq('tenant_id', userScope.tenantId)
    .eq('is_system', false); // Cannot delete system tags

  if (error) {
    console.error('[conversations] Error deleting tag:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}
