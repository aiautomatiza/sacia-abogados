/**
 * @fileoverview Messages Panel Component - ADAPTADO PARA TENANT-BASED
 * @description Panel displaying conversation messages with auto-scroll and date separators
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Filtros por clinic_id en queries
 * - ✅ Adaptado: usa userId simple para determinar mensajes propios
 * - Sin cambios en lógica de visualización
 */

import { useEffect, useRef, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageBubble } from "./MessageBubble";
import { DateBadge } from "./DateBadge";
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

  // Group messages by date for separators
  const messagesWithDates = useMemo(() => {
    const result: Array<{
      type: "message" | "date";
      data: MessageWithSender | string;
    }> = [];

    let currentDate: Date | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);

      // Add date separator if date changed
      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        result.push({
          type: "date",
          data: format(messageDate, "yyyy-MM-dd"),
        });
        currentDate = messageDate;
      }

      result.push({
        type: "message",
        data: message,
      });
    });

    return result;
  }, [messages]);

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
      // Use setTimeout to ensure virtualizer is ready
      const timer = setTimeout(() => {
        try {
          // Verify container exists and has size
          if (parentRef.current && parentRef.current.offsetHeight > 0) {
            const targetIndex = messagesWithDates.length - 1;
            // Verify index is valid
            if (targetIndex >= 0 && targetIndex < messagesWithDates.length) {
              virtualizer.scrollToIndex(targetIndex, {
                align: 'end',
                behavior: 'smooth',
              });
            }
          }
        } catch (error) {
          console.error('Error scrolling to message:', error);
        }
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
      className="flex-1 overflow-auto px-4 py-2"
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
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Loading Indicator */}
      {isLoading && messages.length === 0 && (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
