/**
 * @fileoverview Conversation Header Component - ADAPTADO PARA TENANT-BASED
 * @description Header showing contact info and conversation actions
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Badge de clínica
 * - ❌ Eliminado: Filtros y acciones basadas en clinic_id
 * - ✅ Adaptado: contact.nombre en vez de contact.name
 * - ✅ Adaptado: contact.numero en vez de contact.phone
 * - Sin cambios en acciones principales (archivar, asignar, etc.)
 */

import { Archive, UserPlus, MoreVertical, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "./ChannelBadge";
import type { ConversationWithContact } from "../types";

interface Props {
  conversation: ConversationWithContact;
  onArchive?: () => void;
  onAssign?: () => void;
  onToggleInfo?: () => void;
  showInfoPanel?: boolean;
}

export function ConversationHeader({ conversation, onArchive, onAssign, onToggleInfo, showInfoPanel = false }: Props) {
  const { contact } = conversation;

  // Get contact initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Contact Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {contact?.nombre ? getInitials(contact.nombre) : "?"}
            </AvatarFallback>
          </Avatar>

          {/* Name and Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{contact?.nombre || "Sin nombre"}</h3>
              <ChannelBadge channel={conversation.channel} />
              {conversation.status === "archived" && (
                <Badge variant="secondary" className="text-xs">
                  Archivada
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {contact?.numero && <span className="truncate">{contact.numero}</span>}
              {conversation.assigned_user && (
                <>
                  <span>•</span>
                  <span className="truncate">Asignado a: {conversation.assigned_user.full_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Video Call Button (solo para Webchat) */}
          {conversation.channel === "webchat" && (
            <Button variant="ghost" size="icon" title="Videollamada">
              <Video className="h-4 w-4" />
            </Button>
          )}

          {/* Toggle Info Panel */}
          <Button
            variant={showInfoPanel ? "secondary" : "ghost"}
            size="icon"
            onClick={onToggleInfo}
            title="Información del contacto"
          >
            <Info className="h-4 w-4" />
          </Button>

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onAssign}>
                <UserPlus className="h-4 w-4 mr-2" />
                Asignar agente
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {conversation.status === "archived" ? "Desarchivar" : "Archivar conversación"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tags */}
      {conversation.tags && conversation.tags.length > 0 && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {conversation.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
