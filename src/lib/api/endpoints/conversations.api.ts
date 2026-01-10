/**
 * @fileoverview Conversations API Endpoints
 * @description Type-safe wrappers for Conversations API Gateway endpoints
 * Phase 3: Queries (GET)
 * Phase 4: Mutations (POST, PATCH, DELETE)
 */

import { apiRequest } from '../client';
import type {
  ConversationWithContact,
  ConversationFilters,
  ConversationsResponse,
  MessagesResponse,
  ConversationTag,
  ConversationStatus,
} from '@/features/conversations/types';

/**
 * Get paginated list of conversations with filters
 *
 * @param filters - Filter criteria
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated conversations response
 */
export async function getConversations(
  filters: ConversationFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<ConversationsResponse> {
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
  if (filters.assigned_to !== undefined) {
    params.assigned_to = filters.assigned_to === null ? 'null' : filters.assigned_to;
  }
  if (filters.tags && filters.tags.length > 0) {
    params.tags = filters.tags.join(',');
  }
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.unread_only) {
    params.unread_only = 'true';
  }
  if (filters.pending_response_only) {
    params.pending_response_only = 'true';
  }
  if (filters.whatsapp_number_id) {
    params.whatsapp_number_id = filters.whatsapp_number_id;
  }
  if (filters.sort_by) {
    params.sort_by = filters.sort_by;
  }
  if (filters.sort_order) {
    params.sort_order = filters.sort_order;
  }

  return apiRequest<ConversationsResponse>('/api/conversations', {
    method: 'GET',
    params,
  });
}

/**
 * Get a single conversation by ID
 *
 * @param conversationId - Conversation ID
 * @returns Conversation with contact info
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithContact> {
  return apiRequest<ConversationWithContact>(`/api/conversations/${conversationId}`, {
    method: 'GET',
  });
}

/**
 * Get a conversation by contact ID
 * Useful for finding existing conversation when starting a new chat
 *
 * @param contactId - Contact ID
 * @returns Conversation with contact info or null if not found
 */
export async function getConversationByContactId(
  contactId: string
): Promise<ConversationWithContact | null> {
  const response = await apiRequest<ConversationWithContact | { conversation: null }>(
    `/api/conversations/by-contact/${contactId}`,
    {
      method: 'GET',
    }
  );

  // Handle both response formats
  if (response && 'conversation' in response && response.conversation === null) {
    return null;
  }

  return response as ConversationWithContact;
}

/**
 * Get paginated list of messages for a conversation
 *
 * @param conversationId - Conversation ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated messages response
 */
export async function getMessages(
  conversationId: string,
  page: number = 1,
  pageSize: number = 100
): Promise<MessagesResponse> {
  const params: Record<string, string> = {
    page: page.toString(),
    pageSize: pageSize.toString(),
  };

  return apiRequest<MessagesResponse>(
    `/api/conversations/${conversationId}/messages`,
    {
      method: 'GET',
      params,
    }
  );
}

/**
 * Get all conversation tags for the current tenant
 *
 * @returns Array of conversation tags
 */
export async function getTags(): Promise<ConversationTag[]> {
  const response = await apiRequest<{ data: ConversationTag[] }>('/api/tags', {
    method: 'GET',
  });

  return response.data;
}

// ============================================================================
// MUTATION ENDPOINTS (Phase 4)
// ============================================================================

/**
 * Updates a conversation (status, tags, assigned_to)
 * All fields are optional
 *
 * @param conversationId - Conversation ID
 * @param updates - Partial updates
 * @returns Success response
 */
export async function updateConversation(
  conversationId: string,
  updates: {
    status?: ConversationStatus;
    tags?: string[];
    assigned_to?: string | null;
  }
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: updates,
  });
}

/**
 * Marks a conversation as read (unread_count = 0)
 *
 * @param conversationId - Conversation ID
 * @returns Success response
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/conversations/${conversationId}/read`, {
    method: 'POST',
  });
}

/**
 * Deletes a conversation
 *
 * @param conversationId - Conversation ID
 * @returns Success response
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

/**
 * Creates a new conversation tag
 *
 * @param tag - Tag data
 * @returns Created tag
 */
export async function createTag(tag: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<ConversationTag> {
  return apiRequest<ConversationTag>('/api/tags', {
    method: 'POST',
    body: tag,
  });
}

/**
 * Updates a conversation tag
 * Cannot update system tags
 *
 * @param tagId - Tag ID
 * @param updates - Partial tag updates
 * @returns Success response
 */
export async function updateTag(
  tagId: string,
  updates: {
    name?: string;
    color?: string;
    icon?: string;
  }
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/tags/${tagId}`, {
    method: 'PATCH',
    body: updates,
  });
}

/**
 * Deletes a conversation tag
 * Cannot delete system tags
 *
 * @param tagId - Tag ID
 * @returns Success response
 */
export async function deleteTag(tagId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/tags/${tagId}`, {
    method: 'DELETE',
  });
}
