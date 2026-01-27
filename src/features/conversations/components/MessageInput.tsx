/**
 * @fileoverview Message Input Component
 * @description Input for sending messages with text, files, audio and templates support
 */

import { useState, useRef, KeyboardEvent } from "react";
import { Paperclip, Send, Mic, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AudioRecorder } from "./AudioRecorder";
import { TemplateSelector, type TemplateSelectionData } from "./TemplateSelector";
import { WhatsApp24hTimer } from "./WhatsApp24hTimer";
import { useWhatsAppWindow } from "../hooks/useWhatsAppWindow";
import type { ConversationWithContact, MessageContentType } from "../types";

interface Props {
  conversation: ConversationWithContact;
  currentUserId: string | null;
  onSendMessage: (input: {
    conversation_id: string;
    sender_type: "agent" | "system" | "ai";
    sender_id?: string;
    content?: string;
    content_type: MessageContentType;
    file_url?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
  }) => Promise<void>;
  onUploadFile: (file: File) => Promise<string>;
  isLoading?: boolean;
}

export function MessageInput({ conversation, currentUserId, onSendMessage, onUploadFile, isLoading = false }: Props) {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use useWhatsAppWindow hook for 24h window calculation
  const { isExpired } = useWhatsAppWindow(conversation.whatsapp_24h_window_expires_at ?? null);
  const isWithinWhatsAppWindow = conversation.channel !== "whatsapp" || !isExpired;

  const handleSend = async () => {
    if ((!content.trim() && !selectedFile) || isLoading || isUploading) {
      return;
    }

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;
      let fileSize: number | undefined;
      let contentType: MessageContentType = "text";

      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        fileUrl = await onUploadFile(selectedFile);

        // Validate upload was successful
        if (!fileUrl) {
          throw new Error("Error al subir el archivo");
        }

        fileName = selectedFile.name;
        fileType = selectedFile.type;
        fileSize = selectedFile.size;
        contentType = getContentTypeFromMimeType(selectedFile.type);
      }

      await onSendMessage({
        conversation_id: conversation.id,
        sender_type: "agent",
        sender_id: currentUserId || undefined,
        content: content.trim() || undefined,
        content_type: contentType,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
      });

      // Reset form
      setContent("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert("El archivo es demasiado grande (máximo 50MB)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAudioRecorded = async (audioFile: File): Promise<void> => {
    try {
      setIsUploading(true);
      const fileUrl = await onUploadFile(audioFile);

      // Validate upload was successful
      if (!fileUrl) {
        throw new Error("Error al subir el archivo de audio");
      }

      await onSendMessage({
        conversation_id: conversation.id,
        sender_type: "agent",
        sender_id: currentUserId || undefined,
        content_type: "audio",
        file_url: fileUrl,
        file_name: audioFile.name,
        file_type: audioFile.type,
        file_size: audioFile.size,
      });

      setShowAudioRecorder(false);
    } catch (error) {
      console.error("Error sending audio:", error);
      // Re-throw to let AudioRecorder know the send failed
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleTemplateSelected = async (data: TemplateSelectionData) => {
    try {
      setIsUploading(true);
      
      await onSendMessage({
        conversation_id: conversation.id,
        sender_type: "agent",
        sender_id: currentUserId || undefined,
        content: data.resolvedContent,
        content_type: "text",
        // Metadata del template para el webhook
        metadata: {
          is_template: true,
          template_id: data.templateExternalId,
          template_name: data.templateName,
          template_variables: data.variableValues,
        },
      } as Parameters<typeof onSendMessage>[0]);
      
      setShowTemplateSelector(false);
    } catch (error) {
      console.error("Error sending template message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Show audio recorder modal
  if (showAudioRecorder) {
    return (
      <div className="border-t p-4 bg-background">
        <AudioRecorder onAudioReady={handleAudioRecorded} />
      </div>
    );
  }

  // Show template selector modal
  if (showTemplateSelector) {
    return (
      <div className="border-t p-4 bg-background">
        <TemplateSelector
          conversationId={conversation.id}
          onSelect={handleTemplateSelected}
          onCancel={() => setShowTemplateSelector(false)}
        />
      </div>
    );
  }

  return (
    <div className="border-t p-4 bg-background">
      {/* WhatsApp 24h Window Warning */}
      {conversation.channel === "whatsapp" && !isWithinWhatsAppWindow && (
        <Alert className="mb-3">
          <AlertDescription className="text-sm">
            La ventana de 24 horas ha expirado. Solo puedes enviar mensajes con plantillas aprobadas.
          </AlertDescription>
        </Alert>
      )}

      {/* WhatsApp 24h Timer */}
      {conversation.channel === "whatsapp" && conversation.whatsapp_24h_window_expires_at && (
        <div className="mb-2">
          <WhatsApp24hTimer expiresAt={conversation.whatsapp_24h_window_expires_at} />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
            ✕
          </Button>
        </div>
      )}

      {/* Message Input Area */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isWithinWhatsAppWindow ? "Escribe un mensaje..." : "Solo plantillas disponibles"}
          disabled={!isWithinWhatsAppWindow || isLoading || isUploading}
          className="min-h-[60px] max-h-[200px] resize-none"
          rows={2}
        />

        <div className="flex flex-col gap-1">
          {/* File Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!isWithinWhatsAppWindow || isLoading || isUploading}
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Audio Recorder Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!isWithinWhatsAppWindow || isLoading || isUploading}
            onClick={() => setShowAudioRecorder(true)}
            title="Grabar audio"
          >
            <Mic className="h-4 w-4" />
          </Button>

          {/* Template Selector Button (solo WhatsApp fuera de ventana) */}
          {conversation.channel === "whatsapp" && !isWithinWhatsAppWindow && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isLoading || isUploading}
              onClick={() => setShowTemplateSelector(true)}
              title="Seleccionar plantilla"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            type="button"
            size="icon"
            disabled={(!content.trim() && !selectedFile) || !isWithinWhatsAppWindow || isLoading || isUploading}
            onClick={handleSend}
            title="Enviar mensaje"
          >
            {isLoading || isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
    </div>
  );
}

// Helper: Get content type from MIME type
function getContentTypeFromMimeType(mimeType: string): MessageContentType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

// Helper: Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
