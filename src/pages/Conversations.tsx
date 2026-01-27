import { useCallback } from "react";
import {
  ConversationsPage,
  useInfiniteConversations,
  useConversationMessages,
  useSendMessage,
  useRealtimeConversations,
  useRealtimeMessages,
  useConversationsFilters,
  useFileUpload,
  useConversationActions,
  updateConversationTags,
  assignConversation,
  createConversation,
  markAsRead,
  useConversationsUrlState,
} from "@/features/conversations";
import { useContacts } from "@/features/contacts";
import { updateContact } from "@/features/contacts/services/contact.service";
import { useAuth } from "@/contexts/auth-context";
import { useProfile } from "@/hooks/useProfile";
import type { LocalConversationFilters, ConversationFilters } from "@/features/conversations";

// Convert local filters to service filters
const toServiceFilters = (filters: LocalConversationFilters): ConversationFilters => {
  return {
    search: filters.search,
    channel: filters.channel?.[0],
    status: filters.status?.[0] as ConversationFilters["status"],
    assigned_to: filters.assigned_to?.[0],
    tags: filters.tags,
    unread_only: filters.has_unread,
    pending_response_only: filters.pending_response,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order,
  };
};

export default function Conversations() {
  const { urlConversationId, setUrlConversationId } = useConversationsUrlState();
  const { user, scope } = useAuth();
  const { tenantId } = useProfile();
  const { data: contactsData } = useContacts({}, 1);

  const { filters: storedFilters, setFilters: setStoredFilters } = useConversationsFilters();
  const { uploadFile } = useFileUpload();
  const { archiveConversation } = useConversationActions();

  // TIER S: Suscripción realtime granular por conversación seleccionada
  // Se suscribe solo a los mensajes de la conversación activa para actualizaciones instantáneas
  useRealtimeMessages({
    conversationId: urlConversationId,
    debounceMs: 100, // 100ms para UX instantánea
    enabled: !!urlConversationId,
  });

  // Convert stored filters to local filters format
  const filters: LocalConversationFilters = {
    search: storedFilters.search,
    channel: storedFilters.channel ? [storedFilters.channel] : undefined,
    status: storedFilters.status ? [storedFilters.status] : undefined,
    assigned_to: storedFilters.assigned_to ? [storedFilters.assigned_to] : undefined,
    tags: storedFilters.tags,
    has_unread: storedFilters.unread_only,
    pending_response: storedFilters.pending_response_only,
    sort_by: storedFilters.sort_by,
    sort_order: storedFilters.sort_order,
  };

  // Adapter to convert local filters back to stored format
  const setFilters = useCallback((newFilters: LocalConversationFilters) => {
    setStoredFilters({
      search: newFilters.search,
      channel: newFilters.channel?.[0],
      status: newFilters.status?.[0] as ConversationFilters["status"],
      assigned_to: newFilters.assigned_to?.[0],
      tags: newFilters.tags,
      unread_only: newFilters.has_unread,
      pending_response_only: newFilters.pending_response,
      sort_by: newFilters.sort_by,
      sort_order: newFilters.sort_order,
    });
  }, [setStoredFilters]);

  // Handle conversation selection - update URL and mark as read
  const handleConversationSelect = useCallback((id: string | null) => {
    setUrlConversationId(id);
    if (id && scope) {
      // Marcar como leída inmediatamente (estilo WhatsApp)
      markAsRead(id, scope).catch(console.error);
    }
  }, [setUrlConversationId, scope]);

  // Adapter for infinite conversations hook
  const useInfiniteConversationsAdapter = (params: any) => {
    const mergedFilters = { ...filters, ...params.filters };
    const serviceFilters = toServiceFilters(mergedFilters);
    const result = useInfiniteConversations(serviceFilters);
    return {
      conversations: result.conversations,
      total: result.total,
      isLoading: result.isLoading,
      isFetchingNextPage: result.isFetchingNextPage,
      hasNextPage: result.hasNextPage,
      fetchNextPage: result.fetchNextPage,
      error: result.error,
      refetch: () => result.refetch(),
      invalidate: result.invalidate,
    };
  };

  const useSendMessageAdapter = () => {
    const { sendMessage, isLoading } = useSendMessage();
    return {
      sendMessage: async (input: any) => {
        sendMessage(input);
      },
      isLoading,
    };
  };

  // Handle file upload using useFileUpload hook
  const handleUploadFile = useCallback(async (file: File): Promise<string> => {
    const result = await uploadFile(file);
    return result?.file_url || "";
  }, [uploadFile]);

  return (
    <ConversationsPage
      useConversations={useInfiniteConversationsAdapter}
      useConversationMessages={useConversationMessages}
      useSendMessage={useSendMessageAdapter}
      useRealtimeConversations={useRealtimeConversations}
      initialFilters={filters}
      onFiltersChange={setFilters}
      selectedConversationId={urlConversationId}
      onConversationSelect={handleConversationSelect}
      onUploadFile={handleUploadFile}
      onUpdateContact={async (id, updates) => {
        await updateContact(id, updates);
      }}
      onUpdateTags={updateConversationTags}
      onArchiveConversation={async (id) => { archiveConversation(id); }}
      onAssignConversation={assignConversation}
      onCreateConversation={async (input) => {
        if (!tenantId) throw new Error("No tenant ID");
        await createConversation({
          tenant_id: tenantId,
          contact_id: input.contact_id,
          channel: input.channel as "whatsapp" | "instagram" | "webchat" | "email",
        });
      }}
      contacts={contactsData?.data || []}
      currentUserId={user?.id || null}
    />
  );
}
