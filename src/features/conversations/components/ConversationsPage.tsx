/**
 * @fileoverview Conversations Page Component - ADAPTADO PARA TENANT-BASED
 * @description Main page orchestrating the entire conversations module
 */

import { useState, useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { ConversationHeader } from "./ConversationHeader";
import { MessagesPanel } from "./MessagesPanel";
import { MessageInput } from "./MessageInput";
import { ContactInfoPanel } from "./ContactInfoPanel";
import { CreateConversationModal } from "./CreateConversationModal";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { LocalConversationFilters as ConversationFilters } from "../types";

// Persistence key for panel layout
const PANEL_LAYOUT_KEY = "conversations-panel-layout";
const DEFAULT_SIDEBAR_SIZE = 25;

const loadPanelLayout = (): number[] => {
  try {
    const stored = localStorage.getItem(PANEL_LAYOUT_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading panel layout:", e);
  }
  return [DEFAULT_SIDEBAR_SIZE, 100 - DEFAULT_SIDEBAR_SIZE];
};

interface UseConversationsHook {
  conversations: any[];
  total: number;
  isLoading: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  error: Error | null;
  refetch: () => void;
  invalidate: () => void;
}

interface UseConversationMessagesHook {
  messages: any[];
  total: number;
  isLoading: boolean;
  error: Error | null;
}

interface UseSendMessageHook {
  sendMessage: (input: any) => Promise<void>;
  isLoading: boolean;
}

interface Props {
  useConversations: (params: {
    filters?: ConversationFilters;
    page?: number;
    pageSize?: number;
  }) => UseConversationsHook;

  useConversationMessages: (conversationId: string | null) => UseConversationMessagesHook;

  useSendMessage: () => UseSendMessageHook;

  useRealtimeConversations: () => { isConnected: boolean };

  initialFilters?: ConversationFilters;
  onFiltersChange?: (filters: ConversationFilters) => void;

  // URL-based conversation selection
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string | null) => void;

  onUploadFile: (file: File) => Promise<string>;
  onUpdateContact: (contactId: string, updates: Record<string, any>) => Promise<void>;
  onUpdateTags: (conversationId: string, tags: string[]) => Promise<void>;
  onArchiveConversation: (conversationId: string) => Promise<void>;
  onAssignConversation: (conversationId: string, userId: string | null) => Promise<void>;
  onCreateConversation: (input: { contact_id: string; channel: string }) => Promise<void>;

  contacts: any[];
  currentUserId: string | null;
}

export function ConversationsPage({
  useConversations,
  useConversationMessages,
  useSendMessage,
  useRealtimeConversations,
  initialFilters = {},
  onFiltersChange,
  selectedConversationId: externalSelectedId,
  onConversationSelect,
  onUploadFile,
  onUpdateContact,
  onUpdateTags,
  onArchiveConversation,
  onAssignConversation,
  onCreateConversation,
  contacts,
  currentUserId,
}: Props) {
  // Use external ID if provided, otherwise use internal state (fallback)
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedConversationId = externalSelectedId ?? internalSelectedId;

  const [filters, setFilters] = useState<ConversationFilters>(initialFilters);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [panelLayout, setPanelLayout] = useState(loadPanelLayout);

  // Sync filters with parent when they change externally
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const {
    conversations,
    total,
    isLoading: isLoadingConversations,
    isFetchingNextPage = false,
    hasNextPage = false,
    fetchNextPage,
  } = useConversations({
    filters,
  });

  const { messages, isLoading: isLoadingMessages } = useConversationMessages(selectedConversationId);

  const { sendMessage, isLoading: isSendingMessage } = useSendMessage();

  useRealtimeConversations();

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const handleSelectConversation = (conversationId: string) => {
    if (onConversationSelect) {
      onConversationSelect(conversationId);
    } else {
      setInternalSelectedId(conversationId);
    }
    setShowInfoPanel(false);
  };

  const handleFiltersChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleSendMessage = async (input: any) => {
    await sendMessage(input);
  };

  const handleArchive = async () => {
    if (!selectedConversation) return;
    await onArchiveConversation(selectedConversation.id);
  };

  const handleAssign = async () => {
    if (!selectedConversation) return;
    const userId = prompt("Ingresa el ID del usuario:");
    if (userId) {
      await onAssignConversation(selectedConversation.id, userId);
    }
  };

  const handleToggleInfo = () => {
    setShowInfoPanel(!showInfoPanel);
  };

  const handleLoadMore = () => {
    if (fetchNextPage && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleLayoutChange = (sizes: number[]) => {
    setPanelLayout(sizes);
    try {
      localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(sizes));
    } catch (e) {
      console.error("Error saving panel layout:", e);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handleLayoutChange}
        className="h-full"
      >
        {/* Sidebar Panel */}
        <ResizablePanel
          defaultSize={panelLayout[0]}
          minSize={15}
          maxSize={40}
        >
          <ConversationsSidebar
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            onCreateNew={() => setIsCreateModalOpen(true)}
            onFiltersChange={handleFiltersChange}
            filters={filters}
            isLoading={isLoadingConversations}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content Panel */}
        <ResizablePanel defaultSize={panelLayout[1]}>
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {selectedConversation ? (
              <>
                <ConversationHeader
                  conversation={selectedConversation}
                  onArchive={handleArchive}
                  onAssign={handleAssign}
                  onToggleInfo={handleToggleInfo}
                  showInfoPanel={showInfoPanel}
                />

                <MessagesPanel messages={messages} currentUserId={currentUserId} isLoading={isLoadingMessages} />

                <MessageInput
                  conversation={selectedConversation}
                  currentUserId={currentUserId}
                  onSendMessage={handleSendMessage}
                  onUploadFile={onUploadFile}
                  isLoading={isSendingMessage}
                />
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/30">
                <div className="text-center max-w-md">
                  {/* Icon */}
                  <div className="mx-auto w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-semibold mb-2">Tus conversaciones</h2>

                  {/* Description */}
                  <p className="text-muted-foreground mb-8">
                    Selecciona una conversación del panel lateral para ver los mensajes aquí
                  </p>

                  {/* Realtime indicator */}
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Actualizaciones en tiempo real activas
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Create Conversation Modal (controlled) */}
      <CreateConversationModal
        contacts={contacts}
        onCreateConversation={onCreateConversation}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {/* Right Panel: Contact Info */}
      {selectedConversation && showInfoPanel && (
        <ContactInfoPanel
          conversation={selectedConversation}
          onClose={() => setShowInfoPanel(false)}
          onUpdateContact={onUpdateContact}
          onUpdateTags={onUpdateTags}
        />
      )}

      {/* Loading Overlay */}
      {isLoadingConversations && conversations.length === 0 && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando conversaciones...</p>
          </div>
        </div>
      )}
    </div>
  );
}
