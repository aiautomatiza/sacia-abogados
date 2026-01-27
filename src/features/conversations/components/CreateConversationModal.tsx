/**
 * @fileoverview Create Conversation Modal Component - ADAPTADO PARA TENANT-BASED
 * @description Modal for creating new conversations with contact selection and channel choice
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Selector de clínica
 * - ❌ Eliminado: Validaciones basadas en clinic_id
 * - ✅ Adaptado: Solo usa tenant_id del usuario autenticado
 * - Sin cambios en flujo principal
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactSelectorForConversation } from "./ContactSelectorForConversation";
import type { ConversationChannel } from "../types";

interface Contact {
  id: string;
  nombre: string;
  numero: string | null;
  attributes?: Record<string, any>;
}

interface Props {
  contacts: Contact[];
  onCreateConversation: (input: { contact_id: string; channel: ConversationChannel }) => Promise<void>;
  isLoading?: boolean;
  trigger?: React.ReactNode;
  // Props for controlled mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateConversationModal({ 
  contacts, 
  onCreateConversation, 
  isLoading = false, 
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ConversationChannel>("whatsapp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!selectedContactId) {
      alert("Por favor selecciona un contacto");
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateConversation({
        contact_id: selectedContactId,
        channel: selectedChannel,
      });

      // Reset and close
      setSelectedContactId(null);
      setSelectedChannel("whatsapp");
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Error al crear la conversación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setSelectedContactId(null);
      setSelectedChannel("whatsapp");
    }
    setIsOpen(open);
  };

  // In controlled mode, don't render a trigger
  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva conversación
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nueva conversación</DialogTitle>
          <DialogDescription>Selecciona un contacto para iniciar una nueva conversación por WhatsApp</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Canal - Solo WhatsApp disponible */}
          <div className="space-y-2">
            <Label htmlFor="channel">Canal de comunicación</Label>
            <Select value={selectedChannel} onValueChange={(value: ConversationChannel) => setSelectedChannel(value)}>
              <SelectTrigger id="channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact Selector */}
          <div className="space-y-2">
            <Label>Contacto</Label>
            <ContactSelectorForConversation
              contacts={contacts}
              selectedContactId={selectedContactId}
              onSelect={setSelectedContactId}
              isLoading={isLoading}
              placeholder="Buscar contacto por nombre, teléfono o email..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!selectedContactId || isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear conversación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
