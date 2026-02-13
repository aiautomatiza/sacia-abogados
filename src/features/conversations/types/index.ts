import type { Database } from "@/integrations/supabase/types";
import type { ComercialRole } from "@/types/comercial";

// Database types
export type ConversationChannel = Database["public"]["Enums"]["conversation_channel"];
export type ConversationStatus = Database["public"]["Enums"]["conversation_status"];
export type MessageContentType = Database["public"]["Enums"]["message_content_type"];
export type MessageDeliveryStatus = Database["public"]["Enums"]["message_delivery_status"];
export type MessageSenderType = Database["public"]["Enums"]["message_sender_type"];

// Base types from database
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationMessage = Database["public"]["Tables"]["conversation_messages"]["Row"];
export type ConversationTag = Database["public"]["Tables"]["conversation_tags"]["Row"];

// Contact status from CRM
export interface ContactStatus {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

// Contact from CRM
export interface Contact {
  id: string;
  nombre: string | null;
  numero: string;
  attributes: Record<string, any> | null;
  status_id: string | null;
  status: ContactStatus | null;
}

// WhatsApp number configuration
export interface WhatsAppNumber {
  id: string;
  phone_number_id: string; // Meta/WhatsApp Business API Phone Number ID
  waba_id: string | null; // WhatsApp Business Account ID
  phone_number: string;
  alias: string;
  is_default: boolean;
  status: 'active' | 'inactive';
}

// Enriched conversation with contact info
export interface ConversationWithContact extends Conversation {
  contact: Contact | null;
  whatsapp_number?: WhatsAppNumber | null;
  assigned_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Message with sender info
export interface MessageWithSender extends ConversationMessage {
  sender?: {
    id: string;
    full_name: string;
    email: string | null;
    avatar_url?: string | null;
  } | null;
  replied_to?: {
    id: string;
    content: string | null;
    sender_type: MessageSenderType;
  };
}

// Filters for listing conversations
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

// Local filters (for UI components)
export interface LocalConversationFilters {
  search?: string;
  channel?: ConversationChannel[];
  status?: ConversationStatus[];
  assigned_to?: string[];
  tags?: string[];
  date_from?: string;
  date_to?: string;
  has_unread?: boolean;
  conversation_state?: ('ia' | 'equipo' | 'sin_asignar')[];
  created_at_from?: string;
  created_at_to?: string;
  pending_response?: boolean;
  whatsapp_number_id?: string;
  sort_by?: 'last_message' | 'created_at' | 'unread_first' | 'name';
  sort_order?: 'asc' | 'desc';
}

// Response types
export interface ConversationsResponse {
  conversations: ConversationWithContact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MessagesResponse {
  messages: MessageWithSender[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Input types
export interface SendMessageInput {
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id?: string;
  content_type: MessageContentType;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  replied_to_message_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateTagInput {
  tenant_id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface CreateConversationInput {
  tenant_id: string;
  contact_id: string;
  channel: ConversationChannel;
  whatsapp_number_id?: string;
}

// User scope for tenant filtering
export interface UserScope {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
  comercialRole: ComercialRole | null;
  locationId: string | null;
}

// WhatsApp window status
export interface WhatsAppWindow {
  hasWindow: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  totalMs: number;
  isExpired: boolean;
}

// File upload result
export interface FileUploadResult {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

// Recording state
export type RecordingState = "idle" | "requesting" | "recording" | "stopped";
