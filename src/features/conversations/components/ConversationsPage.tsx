/**
 * @fileoverview Conversations Page Component - TIER S OPTIMIZADO
 * @description Main page orchestrating the entire conversations module
 * @performance Lazy loading de ContactInfoPanel, debounce en localStorage
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Loader2, MessageSquare, WifiOff, RefreshCw } from "lucide-react";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { ConversationHeader } from "./ConversationHeader";
import { MessagesPanel } from "./MessagesPanel";
import { MessageInput } from "./MessageInput";
import { CreateConversationModal } from "./CreateConversationModal";
import { Skeleton } from "@/components/ui/skeleton";

// TIER S: Lazy loading de ContactInfoPanel - solo se carga cuando se necesita
const ContactInfoPanel = lazy(() =>
  import("./ContactInfoPanel").then((m) => ({ default: m.ContactInfoPanel }))
);

// TIER S: Skeleton para ContactInfoPanel mientras carga
function ContactInfoPanelSkeleton() {
  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-background border-l p-4 space-y-4 z-40">
      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      <Skeleton className="h-6 w-32 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto" />
      <div className="space-y-3 mt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
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

  useRealtimeConversations: () => {
    isConnected: boolean;
    connectionStatus?: "initializing" | "connecting" | "connected" | "disconnected" | "error";
  };

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

  // TIER S: Capturamos connectionStatus para mostrar indicador visual
  const { isConnected, connectionStatus } = useRealtimeConversations();

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

  // TIER S: Debounced save to localStorage para evitar writes excesivos durante resize
  const debouncedSaveLayout = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (sizes: number[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(sizes));
        } catch (e) {
          console.error("Error saving panel layout:", e);
        }
      }, 500); // Debounce de 500ms
    };
  }, []);

  const handleLayoutChange = useCallback(
    (sizes: number[]) => {
      setPanelLayout(sizes);
      debouncedSaveLayout(sizes);
    },
    [debouncedSaveLayout]
  );

  return (
    <div className="relative flex h-full bg-background overflow-hidden">
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

                  {/* TIER S: Realtime indicator con estado real */}
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isConnected
                          ? "bg-green-500 animate-pulse"
                          : "bg-yellow-500"
                      }`}
                    />
                    {isConnected
                      ? "Actualizaciones en tiempo real activas"
                      : "Conectando..."}
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

      {/* Right Panel: Contact Info - TIER S: Lazy loaded */}
      {selectedConversation && showInfoPanel && (
        <Suspense fallback={<ContactInfoPanelSkeleton />}>
          <ContactInfoPanel
            conversation={selectedConversation}
            onClose={() => setShowInfoPanel(false)}
            onUpdateContact={onUpdateContact}
            onUpdateTags={onUpdateTags}
          />
        </Suspense>
      )}

      {/* TIER S: Connection Status Indicator */}
      {connectionStatus && connectionStatus !== "connected" && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
              connectionStatus === "error"
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                : connectionStatus === "disconnected"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            }`}
          >
            {connectionStatus === "error" ? (
              <>
                <WifiOff className="h-4 w-4" />
                Error de conexión
              </>
            ) : connectionStatus === "disconnected" ? (
              <>
                <WifiOff className="h-4 w-4" />
                Desconectado
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {connectionStatus === "connecting" ? "Conectando..." : "Inicializando..."}
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingConversations && conversations.length === 0 && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando conversaciones...</p>
          </div>
        </div>
      )}
    </div>
  );
}
