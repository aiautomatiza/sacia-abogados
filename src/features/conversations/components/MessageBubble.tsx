/**
 * @fileoverview Message Bubble Component - ADAPTADO PARA TENANT-BASED
 * @description Individual message bubble with sender, content, attachments and status
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Referencias a clinic_id, account_id
 * - ✅ Adaptado: Solo usa tenant_id (no necesita mostrarlo en UI)
 * - ✅ Adaptado: sender.full_name en vez de sender.name
 * - Sin cambios en lógica de visualización
 */

import { memo } from 'react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MessageStatus } from "./MessageStatus";
import { FilePreview } from "./FilePreview";
import type { MessageWithSender } from "../types";

interface Props {
  message: MessageWithSender;
  isOwnMessage: boolean;
  showSender?: boolean;
  showTimestamp?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, isOwnMessage, showSender = true, showTimestamp = true }: Props) {
  const hasAttachment = message.file_url && message.content_type !== "text";

  return (
    <div className={cn("flex items-start gap-2 mb-3", isOwnMessage ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar - Solo para mensajes del contacto */}
      {!isOwnMessage && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10">
            {message.sender_type === "contact" ? "C" : "S"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col max-w-[70%]", isOwnMessage ? "items-end" : "items-start")}>
        {/* Sender Name */}
        {showSender && message.sender && !isOwnMessage && (
          <span className="text-xs text-muted-foreground mb-1 px-1">{message.sender.full_name}</span>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-lg px-3 py-2 shadow-sm",
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
            hasAttachment && "p-1",
          )}
        >
          {/* File Attachment */}
          {hasAttachment && (
            <div className="mb-2">
              <FilePreview
                fileUrl={message.file_url!}
                fileName={message.file_name || "archivo"}
                fileType={message.file_type || "application/octet-stream"}
                fileSize={message.file_size}
              />
            </div>
          )}

          {/* Text Content */}
          {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}

          {/* Timestamp and Status */}
          <div className={cn("flex items-center gap-1 mt-1", isOwnMessage ? "justify-end" : "justify-start")}>
            {showTimestamp && (
              <span className={cn("text-xs", isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {format(new Date(message.created_at), "HH:mm", { locale: es })}
              </span>
            )}

            {/* Status (solo para mensajes outgoing) */}
            {isOwnMessage && <MessageStatus status={message.delivery_status} />}
          </div>
        </div>

        {/* Replied To Message (si aplica) */}
        {message.replied_to && (
          <div
            className={cn(
              "text-xs text-muted-foreground mt-1 px-2 py-1 rounded bg-muted/50 border-l-2",
              isOwnMessage ? "border-primary" : "border-muted-foreground",
            )}
          >
            <span className="font-medium">Respondiendo a: </span>
            <span className="italic">
              {message.replied_to.content
                ? message.replied_to.content.substring(0, 50) + (message.replied_to.content.length > 50 ? "..." : "")
                : "Archivo adjunto"}
            </span>
          </div>
        )}

        {/* Error Message */}
        {message.delivery_status === "failed" && message.error_message && (
          <div className="text-xs text-destructive mt-1 px-1">Error: {message.error_message}</div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - solo re-renderiza si cambian estos valores críticos
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.delivery_status === nextProps.message.delivery_status &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.showSender === nextProps.showSender &&
    prevProps.showTimestamp === nextProps.showTimestamp
  );
});
