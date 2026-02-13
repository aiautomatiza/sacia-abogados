import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchTerm } from "@/lib/utils/search";
import { assertTenantAccess } from "@/lib/utils/tenant";
import { getVisibleContactIdsForScope } from "@/lib/utils/comercial-filters";
import {
  sendMessageSchema,
  createConversationSchema,
  createTagSchema,
} from "@/lib/validations/conversation";
import type {
  ConversationWithContact,
  ConversationsResponse,
  ConversationFilters,
  MessageWithSender,
  MessagesResponse,
  SendMessageInput,
  ConversationTag,
  CreateTagInput,
  UserScope,
  ConversationStatus,
  MessageDeliveryStatus,
  CreateConversationInput,
} from "../types";

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Lista conversaciones con filtros y paginación
 *
 * TIER S NOTA: La búsqueda usa dos queries (contactos + conversaciones) porque
 * PostgREST no soporta filtrar en relaciones embebidas directamente.
 * Para optimización futura, considerar:
 * - Crear función RPC en Postgres para búsqueda optimizada
 * - Agregar full-text search index en crm_contacts
 * - Usar vista materializada para búsqueda frecuente
 */
export const listConversations = async ({
  scope,
  filters = {},
  page = 1,
  pageSize = 50,
}: {
  scope: UserScope;
  filters?: ConversationFilters;
  page?: number;
  pageSize?: number;
}): Promise<ConversationsResponse> => {
  const offset = (page - 1) * pageSize;
  const hasSearch = filters.search && filters.search.trim().length > 0;

  // Comercial role filtering: pre-fetch visible contact IDs
  const visibleContactIds = await getVisibleContactIdsForScope(scope);

  // If comercial filtering returned an empty array, no contacts are visible
  if (visibleContactIds !== null && visibleContactIds.length === 0) {
    return {
      conversations: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // Si hay búsqueda, primero obtenemos los IDs de contactos que coinciden
  // TIER S: Limitamos la búsqueda a 200 contactos para evitar queries pesadas
  let matchingContactIds: string[] | null = null;

  if (hasSearch) {
    const sanitized = sanitizeSearchTerm(filters.search!.trim());
    const searchTerm = `%${sanitized}%`;
    const { data: matchingContacts, error: contactError } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("tenant_id", scope.tenantId)
      .or(`nombre.ilike.${searchTerm},numero.ilike.${searchTerm}`)
      .limit(200); // TIER S: Límite para evitar queries pesadas

    if (contactError) {
      console.error("Error searching contacts:", contactError);
      throw contactError;
    }

    matchingContactIds = matchingContacts?.map(c => c.id) || [];

    // Si no hay contactos que coincidan, retornar vacío
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

  // Contact status filtering: pre-fetch contact IDs with matching statuses
  let statusContactIds: string[] | null = null;

  if (filters.contact_status_ids && filters.contact_status_ids.length > 0) {
    const { data: statusContacts, error: statusError } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("tenant_id", scope.tenantId)
      .in("status_id", filters.contact_status_ids)
      .limit(500);

    if (statusError) {
      console.error("Error filtering contacts by status:", statusError);
      throw statusError;
    }

    statusContactIds = statusContacts?.map(c => c.id) || [];

    if (statusContactIds.length === 0) {
      return {
        conversations: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // Intersect with search results if both filters are active
    if (matchingContactIds !== null) {
      const statusSet = new Set(statusContactIds);
      matchingContactIds = matchingContactIds.filter(id => statusSet.has(id));
      if (matchingContactIds.length === 0) {
        return { conversations: [], total: 0, page, pageSize, totalPages: 0 };
      }
    } else {
      matchingContactIds = statusContactIds;
    }
  }

  let query = supabase
    .from("conversations")
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
      { count: "estimated" } // TIER S: Más rápido que "exact", evita full table scan
    )
    .eq("tenant_id", scope.tenantId);

  // Aplicar filtro de búsqueda por contact_id si hay búsqueda
  if (matchingContactIds && matchingContactIds.length > 0) {
    // If we also have comercial visibility filtering, intersect both sets
    if (visibleContactIds !== null) {
      const intersection = matchingContactIds.filter(id => visibleContactIds.includes(id));
      if (intersection.length === 0) {
        return { conversations: [], total: 0, page, pageSize, totalPages: 0 };
      }
      query = query.in("contact_id", intersection);
    } else {
      query = query.in("contact_id", matchingContactIds);
    }
  } else if (visibleContactIds !== null) {
    // Apply comercial visibility filter (no search)
    query = query.in("contact_id", visibleContactIds);
  }

  if (filters.channel) {
    query = query.eq("channel", filters.channel);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.assigned_to !== undefined) {
    if (filters.assigned_to === null) {
      query = query.is("assigned_to", null);
    } else {
      query = query.eq("assigned_to", filters.assigned_to);
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains("tags", filters.tags);
  }

  if (filters.unread_only) {
    query = query.gt("unread_count", 0);
  }

  if (filters.pending_response_only) {
    query = query.eq("pending_agent_response", true);
  }

  if (filters.whatsapp_number_id) {
    query = query.eq("whatsapp_number_id", filters.whatsapp_number_id);
  }

  // Aplicar ordenamiento dinámico
  const sortOrder = filters.sort_order === 'asc';
  
  switch (filters.sort_by) {
    case 'created_at':
      query = query.order("created_at", { ascending: sortOrder, nullsFirst: false });
      break;
    case 'unread_first':
      // Ordenar por unread_count desc primero, luego por last_message_at
      query = query.order("unread_count", { ascending: false });
      query = query.order("last_message_at", { ascending: false, nullsFirst: false });
      break;
    case 'name':
      // Para ordenar por nombre necesitamos ordenar client-side después
      // ya que contact es una relación embebida
      query = query.order("last_message_at", { ascending: false, nullsFirst: false });
      break;
    case 'last_message':
    default:
      query = query.order("last_message_at", { ascending: sortOrder, nullsFirst: false });
      break;
  }
  
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error listing conversations:", error);
    throw error;
  }

  let conversations = (data as ConversationWithContact[]) || [];
  
  // Ordenar por nombre client-side si es necesario (no se puede hacer en PostgREST para relaciones)
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
};

export const getConversationByContactId = async (
  contactId: string,
  scope: UserScope
): Promise<ConversationWithContact | null> => {
  const { data, error } = await supabase
    .from("conversations")
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
    .eq("contact_id", contactId)
    .eq("tenant_id", scope.tenantId)
    .maybeSingle();

  if (error) {
    console.error("Error getting conversation by contact:", error);
    throw error;
  }

  if (data) {
    // Application-level tenant validation (defense in depth)
    await assertTenantAccess(data.tenant_id, scope, 'conversation');
  }

  return data as ConversationWithContact | null;
};

export const getConversationById = async (
  conversationId: string,
  scope: UserScope
): Promise<ConversationWithContact | null> => {
  const { data, error } = await supabase
    .from("conversations")
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
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId)
    .maybeSingle();

  if (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }

  if (data) {
    // Application-level tenant validation (defense in depth)
    await assertTenantAccess(data.tenant_id, scope, 'conversation');
  }

  return data as ConversationWithContact | null;
};

export const markAsRead = async (conversationId: string, scope: UserScope): Promise<void> => {
  const { error } = await supabase
    .from("conversations")
    .update({
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error marking conversation as read:", error);
    throw error;
  }
};

export const updateConversationTags = async (
  conversationId: string,
  tags: string[],
  scope: UserScope
): Promise<void> => {
  const { error } = await supabase
    .from("conversations")
    .update({
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error updating conversation tags:", error);
    throw error;
  }
};

export const updateConversationStatus = async (
  conversationId: string,
  status: ConversationStatus,
  scope: UserScope
): Promise<void> => {
  const { error } = await supabase
    .from("conversations")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error updating conversation status:", error);
    throw error;
  }
};

export const updateConversationState = async (
  conversationId: string,
  state: string | null,
  scope: UserScope
): Promise<void> => {
  const { error } = await supabase
    .from("conversations")
    .update({
      state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error updating conversation state:", error);
    throw error;
  }
};

export const assignConversation = async (
  conversationId: string,
  userId: string | null,
  scope: UserScope
): Promise<void> => {
  const { error } = await supabase
    .from("conversations")
    .update({
      assigned_to: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error assigning conversation:", error);
    throw error;
  }
};

export const deleteConversation = async (conversationId: string, scope: UserScope): Promise<void> => {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

export const createConversation = async (
  input: CreateConversationInput
): Promise<ConversationWithContact> => {
  // Validate input with Zod
  const validated = createConversationSchema.parse(input);

  const { data: existing } = await supabase
    .from("conversations")
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
    .eq("contact_id", validated.contact_id)
    .eq("channel", validated.channel)
    .maybeSingle();

  if (existing) {
    return existing as ConversationWithContact;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      tenant_id: validated.tenant_id,
      contact_id: validated.contact_id,
      channel: validated.channel,
      status: "active",
      whatsapp_number_id: (validated as any).whatsapp_number_id || null,
    })
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
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data as ConversationWithContact;
};

// ============================================================================
// MESSAGES
// ============================================================================

export const listMessages = async ({
  conversationId,
  scope,
  page = 1,
  pageSize = 100,
}: {
  conversationId: string;
  scope: UserScope;
  page?: number;
  pageSize?: number;
}): Promise<MessagesResponse> => {
  // SECURITY: Validate conversation belongs to current tenant before fetching messages
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("tenant_id")
    .eq("id", conversationId)
    .eq("tenant_id", scope.tenantId)
    .single();

  if (convError || !conversation) {
    console.error("Conversation not found or unauthorized access:", convError);
    throw new Error("Conversation not found or unauthorized access");
  }

  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from("conversation_messages")
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
      { count: "exact" }
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true }) // TIER S: ASC para evitar .reverse() en cliente
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Error listing messages:", error);
    throw error;
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
};

export const sendMessage = async (
  input: SendMessageInput,
  scope: UserScope
): Promise<MessageWithSender | null> => {
  // Validate input with Zod
  const validated = sendMessageSchema.parse(input);

  // SECURITY: Get conversation and validate tenant ownership
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("whatsapp_number_id, tenant_id")
    .eq("id", validated.conversation_id)
    .eq("tenant_id", scope.tenantId)  // CRITICAL: Validate tenant ownership
    .single();

  if (convError) {
    console.error("Error fetching conversation:", convError);
    throw new Error(`Failed to fetch conversation: ${convError.message}`);
  }

  const { data: message, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: validated.conversation_id,
      sender_type: validated.sender_type,
      sender_id: validated.sender_id || null,
      content_type: validated.content_type,
      content: validated.content || null,
      file_url: validated.file_url || null,
      file_name: validated.file_name || null,
      file_type: validated.file_type || null,
      file_size: validated.file_size || null,
      replied_to_message_id: validated.replied_to_message_id || null,
      metadata: validated.metadata || {},
      delivery_status: "sending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating message:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }

  if (message) {
    // If an agent sends a message, mark conversation as "equipo" (team-managed)
    if (validated.sender_type === "agent") {
      const { error: stateError } = await supabase
        .from("conversations")
        .update({
          state: "equipo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.conversation_id)
        .eq("tenant_id", scope.tenantId);

      if (stateError) {
        console.error("[SendMessage] Error updating conversation state to 'equipo':", stateError);
        // Don't throw - this is a non-critical update
      }
    }

    // Call Edge Function to send message to external channel (WhatsApp, etc.)
    // Note: Supabase client automatically includes the auth token
    const payload = {
      message_id: message.id,
      conversation_id: validated.conversation_id,
      phone_number_id: conversation?.whatsapp_number_id || null,
    };

    console.log("[SendMessage] Invoking Edge Function with payload:", payload);

    try {
      const { data: fnData, error: fnError } = await supabase.functions
        .invoke("send-conversation-message", {
          body: payload,
        });

      if (fnError) {
        console.error("[SendMessage] Edge Function error:", fnError);
        console.error("[SendMessage] Error details:", {
          name: fnError.name,
          message: fnError.message,
          context: (fnError as any).context,
        });
        // Update delivery_status so the message doesn't stay stuck at "sending"
        await supabase
          .from("conversation_messages")
          .update({
            delivery_status: "failed" as MessageDeliveryStatus,
            error_message: `Edge Function error: ${fnError.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.id);
      } else {
        console.log("[SendMessage] Edge Function response:", fnData);
      }
    } catch (err) {
      console.error("[SendMessage] Exception invoking Edge Function:", err);
      // Update delivery_status so the message doesn't stay stuck at "sending"
      await supabase
        .from("conversation_messages")
        .update({
          delivery_status: "failed" as MessageDeliveryStatus,
          error_message: `Edge Function exception: ${err instanceof Error ? err.message : String(err)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);
    }
  }

  return message as MessageWithSender;
};

export const updateMessageStatus = async (
  messageId: string,
  status: MessageDeliveryStatus,
  errorMessage?: string
): Promise<void> => {
  const updates: {
    delivery_status: MessageDeliveryStatus;
    updated_at: string;
    error_message?: string;
  } = {
    delivery_status: status,
    updated_at: new Date().toISOString(),
  };

  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { error } = await supabase
    .from("conversation_messages")
    .update(updates)
    .eq("id", messageId);

  if (error) {
    console.error("Error updating message status:", error);
    throw error;
  }
};

// ============================================================================
// TAGS
// ============================================================================

export const listTags = async (scope: UserScope): Promise<ConversationTag[]> => {
  const { data, error } = await supabase
    .from("conversation_tags")
    .select("*")
    .eq("tenant_id", scope.tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing tags:", error);
    throw error;
  }

  return data || [];
};

export const createTag = async (input: CreateTagInput): Promise<ConversationTag> => {
  // Validate input with Zod
  const validated = createTagSchema.parse(input);

  const { data, error } = await supabase
    .from("conversation_tags")
    .insert({
      tenant_id: validated.tenant_id,
      name: validated.name,
      color: validated.color,
      icon: validated.icon || null,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating tag:", error);
    throw new Error(`Failed to create tag: ${error.message}`);
  }

  return data;
};

export const updateTag = async (
  id: string,
  updates: Partial<ConversationTag>
): Promise<void> => {
  const { error } = await supabase
    .from("conversation_tags")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating tag:", error);
    throw error;
  }
};

export const deleteTag = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("conversation_tags")
    .delete()
    .eq("id", id)
    .eq("is_system", false);

  if (error) {
    console.error("Error deleting tag:", error);
    throw error;
  }
};
