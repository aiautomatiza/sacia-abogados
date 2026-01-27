/**
 * @fileoverview Messages Panel Component - TIER S OPTIMIZADO
 * @description Panel displaying conversation messages with auto-scroll and date separators
 * @performance Memoización optimizada basada en IDs de mensajes
 */

import { useEffect, useRef, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageBubble } from "./MessageBubble";
import { DateBadge } from "./DateBadge";
import { MessagesSkeleton } from "./MessagesSkeleton";
import type { MessageWithSender } from "../types";

interface Props {
  messages: MessageWithSender[];
  currentUserId: string | null;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessagesPanel({ messages, currentUserId, isLoading = false, onLoadMore, hasMore = false }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // TIER S: Clave estable basada en IDs para evitar recálculos innecesarios
  // Solo recalcula cuando cambian los IDs de los mensajes, no cuando cambia la referencia del array
  const messagesKey = useMemo(
    () => messages.map((m) => m.id).join(","),
    [messages]
  );

  // Group messages by date for separators + calculate consecutive grouping
  const messagesWithDates = useMemo(() => {
    const result: Array<{
      type: "message" | "date";
      data: MessageWithSender | string;
      /** Si es consecutivo del mismo remitente (para reducir espaciado) */
      isConsecutive?: boolean;
      /** Si es el último de un grupo consecutivo */
      isLastInGroup?: boolean;
    }> = [];

    let currentDate: Date | null = null;
    let lastSenderType: string | null = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at);

      // Add date separator if date changed
      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        result.push({
          type: "date",
          data: format(messageDate, "yyyy-MM-dd"),
        });
        currentDate = messageDate;
        lastSenderType = null; // Reset after date separator
      }

      // Calcular si es consecutivo (mismo sender_type que el anterior)
      const isConsecutive = lastSenderType === message.sender_type;

      // Calcular si es el último del grupo (siguiente mensaje es diferente sender o no hay siguiente)
      const nextMessage = messages[index + 1];
      const nextMessageDate = nextMessage ? new Date(nextMessage.created_at) : null;
      const isLastInGroup =
        !nextMessage ||
        nextMessage.sender_type !== message.sender_type ||
        (nextMessageDate && !isSameDay(messageDate, nextMessageDate));

      result.push({
        type: "message",
        data: message,
        isConsecutive,
        isLastInGroup,
      });

      lastSenderType = message.sender_type;
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesKey]); // TIER S: Dependencia en clave estable, no en array completo

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: messagesWithDates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Altura estimada por mensaje
    overscan: 10, // Más overscan para scroll suave
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && messagesWithDates.length > 0) {
      // Use setTimeout + queueMicrotask to ensure scroll happens outside React's render cycle
      const timer = setTimeout(() => {
        queueMicrotask(() => {
          try {
            // Verify container exists and has size
            if (parentRef.current && parentRef.current.offsetHeight > 0) {
              const targetIndex = messagesWithDates.length - 1;
              // Verify index is valid
              if (targetIndex >= 0 && targetIndex < messagesWithDates.length) {
                // Use 'auto' instead of 'smooth' to avoid flushSync issues with dynamic sizes
                virtualizer.scrollToIndex(targetIndex, {
                  align: 'end',
                  behavior: 'auto',
                });
              }
            }
          } catch (error) {
            console.error('Error scrolling to message:', error);
          }
        });
      }, 100);

      return () => clearTimeout(timer);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, messagesWithDates.length, virtualizer]);

  // Handle scroll for load more
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearTop = target.scrollTop < 100;

    if (isNearTop && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No hay mensajes en esta conversación</p>
          <p className="text-xs mt-1">Envía el primer mensaje para iniciar la conversación</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto px-4 py-2 relative"
      style={{ overflowAnchor: 'none' }}
    >
      {/* Load More Indicator */}
      {hasMore && (
        <div className="flex justify-center py-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cargar mensajes anteriores
            </button>
          )}
        </div>
      )}

      {/* Messages with Date Separators - VIRTUALIZADO */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = messagesWithDates[virtualRow.index];

          return (
            <div
              key={`${item.type}-${virtualRow.index}`}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.type === 'date' ? (
                <DateBadge
                  label={format(
                    new Date(item.data as string),
                    "EEEE, d 'de' MMMM 'de' yyyy",
                    { locale: es }
                  )}
                />
              ) : (
                <MessageBubble
                  message={item.data as MessageWithSender}
                  isOwnMessage={
                    (item.data as MessageWithSender).sender_type !== 'contact'
                  }
                  showSender={
                    (item.data as MessageWithSender).sender_type === 'contact'
                  }
                  showTimestamp={true}
                  isConsecutive={item.isConsecutive}
                  isLastInGroup={item.isLastInGroup}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* TIER S: Skeleton Loading State */}
      {isLoading && messages.length === 0 && (
        <div className="absolute inset-0">
          <MessagesSkeleton count={8} />
        </div>
      )}
    </div>
  );
}
