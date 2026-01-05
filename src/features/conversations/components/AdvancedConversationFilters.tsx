/**
 * @fileoverview Advanced Conversation Filters Component - ADAPTADO PARA TENANT-BASED
 * @description Advanced filtering UI for conversations
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Filtros por clinic_id
 * - ❌ Eliminado: Selector de clínica
 * - ❌ Eliminado: conversation_state con opciones de clínica
 * - ✅ Simplificado: Solo filtros tenant-based
 * - Sin cambios en estructura de UI
 */

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { WhatsAppNumberFilter } from "./WhatsAppNumberFilter";
import type { LocalConversationFilters as ConversationFilters } from "../types";

interface Props {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
  availableTags?: string[];
  availableUsers?: Array<{ id: string; full_name: string }>;
}

export function AdvancedConversationFilters({
  filters,
  onFiltersChange,
  availableTags = [],
  availableUsers = [],
}: Props) {
  const [localFilters, setLocalFilters] = useState<ConversationFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const emptyFilters: ConversationFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleChannelToggle = (channel: string) => {
    const current = localFilters.channel || [];
    const updated = current.includes(channel as any)
      ? current.filter((c) => c !== channel)
      : [...current, channel as any];

    setLocalFilters({
      ...localFilters,
      channel: updated.length > 0 ? updated : undefined,
    });
  };

  const handleStatusToggle = (status: string) => {
    const current = localFilters.status || [];
    const updated = current.includes(status as any) ? current.filter((s) => s !== status) : [...current, status as any];

    setLocalFilters({
      ...localFilters,
      status: updated.length > 0 ? updated : undefined,
    });
  };

  const handleStateToggle = (state: string) => {
    const current = localFilters.conversation_state || [];
    const updated = current.includes(state as any) ? current.filter((s) => s !== state) : [...current, state as any];

    setLocalFilters({
      ...localFilters,
      conversation_state: updated.length > 0 ? updated : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const current = localFilters.tags || [];
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];

    setLocalFilters({
      ...localFilters,
      tags: updated.length > 0 ? updated : undefined,
    });
  };

  const activeFiltersCount = [
    localFilters.channel?.length,
    localFilters.status?.length,
    localFilters.conversation_state?.length,
    localFilters.tags?.length,
    localFilters.assigned_to?.length,
    localFilters.has_unread ? 1 : 0,
    localFilters.pending_response ? 1 : 0,
  ].reduce((sum, count) => sum + (count || 0), 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs h-5 min-w-[20px]">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros avanzados</SheetTitle>
          <SheetDescription>Personaliza la vista de tus conversaciones</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Canal */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Canal</Label>
            <div className="space-y-2">
              {["whatsapp", "instagram", "webchat", "email"].map((channel) => (
                <div key={channel} className="flex items-center space-x-2">
                  <Checkbox
                    id={`channel-${channel}`}
                    checked={localFilters.channel?.includes(channel as any)}
                    onCheckedChange={() => handleChannelToggle(channel)}
                  />
                  <label htmlFor={`channel-${channel}`} className="text-sm cursor-pointer capitalize">
                    {channel}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Número de WhatsApp - Solo mostrar si hay canal WhatsApp seleccionado o no hay filtro de canal */}
          {(localFilters.channel?.includes('whatsapp') || !localFilters.channel || localFilters.channel.length === 0) && (
            <WhatsAppNumberFilter
              value={localFilters.whatsapp_number_id}
              onChange={(whatsappNumberId) =>
                setLocalFilters({
                  ...localFilters,
                  whatsapp_number_id: whatsappNumberId,
                })
              }
            />
          )}

          {/* Estado */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Estado</Label>
            <div className="space-y-2">
              {["active", "archived"].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={localFilters.status?.includes(status as any)}
                    onCheckedChange={() => handleStatusToggle(status)}
                  />
                  <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                    {status === "active" ? "Activas" : "Archivadas"}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Gestión */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Gestión</Label>
            <div className="space-y-2">
              {[
                { value: "ia", label: "IA" },
                { value: "equipo", label: "Equipo" },
                { value: "sin_asignar", label: "Sin asignar" },
              ].map((state) => (
                <div key={state.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`state-${state.value}`}
                    checked={localFilters.conversation_state?.includes(state.value as any)}
                    onCheckedChange={() => handleStateToggle(state.value)}
                  />
                  <label htmlFor={`state-${state.value}`} className="text-sm cursor-pointer">
                    {state.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Etiquetas */}
          {availableTags.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Etiquetas</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTags.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={localFilters.tags?.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer">
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asignación */}
          {availableUsers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Asignado a</Label>
              <Select
                value={localFilters.assigned_to?.[0] || "all"}
                onValueChange={(value) =>
                  setLocalFilters({
                    ...localFilters,
                    assigned_to: value === "all" ? undefined : [value],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Otras opciones */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Otras opciones</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-unread"
                  checked={localFilters.has_unread || false}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      has_unread: checked ? true : undefined,
                    })
                  }
                />
                <label htmlFor="has-unread" className="text-sm cursor-pointer">
                  Solo con mensajes no leídos
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending-response"
                  checked={localFilters.pending_response || false}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      pending_response: checked ? true : undefined,
                    })
                  }
                />
                <label htmlFor="pending-response" className="text-sm cursor-pointer">
                  Pendientes de respuesta
                </label>
              </div>
            </div>
          </div>

          {/* Ordenar por */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Ordenar por</Label>
            <Select
              value={localFilters.sort_by || "last_message"}
              onValueChange={(value: any) => setLocalFilters({ ...localFilters, sort_by: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_message">Último mensaje</SelectItem>
                <SelectItem value="created_at">Fecha de creación</SelectItem>
                <SelectItem value="unread_first">No leídas primero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Aplicar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
