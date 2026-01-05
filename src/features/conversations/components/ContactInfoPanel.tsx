/**
 * @fileoverview Contact Info Panel Component - ADAPTADO PARA TENANT-BASED
 * @description Right sidebar showing detailed contact information
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Sección de "Clínica asignada"
 * - ❌ Eliminado: Referencias a clinic_id, account_id
 * - ✅ Adaptado: contact.nombre, contact.numero, contact.attributes
 * - ✅ Adaptado: TenantCommentsDisplay en vez de ClinicCommentsDisplay
 * - Sin cambios en estructura general
 */

import { useState } from "react";
import { X, Mail, Phone, Calendar, MapPin, User, Tag } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ContactFieldGroup } from "./contact-info/ContactFieldGroup";
import { EditableContactField } from "./contact-info/EditableContactField";
import { TenantCommentsDisplay } from "./contact-info/ClinicCommentsDisplay";
import type { ConversationWithContact } from "../types";

interface Props {
  conversation: ConversationWithContact;
  onClose?: () => void;
  onUpdateContact?: (contactId: string, updates: Record<string, any>) => Promise<void>;
  onUpdateTags?: (conversationId: string, tags: string[]) => Promise<void>;
}

export function ContactInfoPanel({ conversation, onClose, onUpdateContact, onUpdateTags }: Props) {
  const { contact } = conversation;
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagsInput, setTagsInput] = useState(conversation.tags?.join(", ") || "");

  const handleUpdateField = async (field: string, value: any) => {
    if (!onUpdateContact) return;

    try {
      await onUpdateContact(contact.id, { [field]: value });
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleSaveTags = async () => {
    if (!onUpdateTags) return;

    try {
      const newTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await onUpdateTags(conversation.id, newTags);
      setIsEditingTags(false);
    } catch (error) {
      console.error("Error updating tags:", error);
    }
  };

  // Extract email from attributes if exists
  const email = contact.attributes?.email || null;

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Información del contacto</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Contact Avatar and Name */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <User className="h-10 w-10" />
            </div>
            <EditableContactField
              label="Nombre"
              value={contact.nombre}
              type="text"
              onSave={(value) => handleUpdateField("nombre", value)}
            />
          </div>

          <Separator />

          {/* Contact Information */}
          <ContactFieldGroup title="Información de contacto" icon={<Phone className="h-4 w-4" />}>
            <EditableContactField
              label="Teléfono"
              value={contact.numero}
              type="phone"
              onSave={(value) => handleUpdateField("numero", value)}
            />

            {email && (
              <EditableContactField
                label="Email"
                value={email}
                type="email"
                onSave={(value) =>
                  handleUpdateField("attributes", {
                    ...contact.attributes,
                    email: value,
                  })
                }
              />
            )}
          </ContactFieldGroup>

          <Separator />

          {/* Tags */}
          <ContactFieldGroup title="Etiquetas" icon={<Tag className="h-4 w-4" />}>
            {!isEditingTags ? (
              <div className="space-y-2">
                {conversation.tags && conversation.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {conversation.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin etiquetas</p>
                )}
                {onUpdateTags && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingTags(true)} className="w-full">
                    Editar etiquetas
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Etiquetas separadas por comas"
                  className="w-full px-3 py-2 text-sm border rounded-md"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTags} className="flex-1">
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingTags(false);
                      setTagsInput(conversation.tags?.join(", ") || "");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </ContactFieldGroup>

          <Separator />

          {/* Additional Attributes */}
          {contact.attributes && Object.keys(contact.attributes).length > 0 && (
            <>
              <ContactFieldGroup title="Información adicional" icon={<MapPin className="h-4 w-4" />}>
                <div className="space-y-2">
                  {Object.entries(contact.attributes).map(([key, value]) => {
                    // Skip email as it's shown above
                    if (key === "email") return null;

                    return (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-muted-foreground">{key}:</span> <span>{String(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </ContactFieldGroup>
              <Separator />
            </>
          )}

          {/* Conversation Metadata */}
          <ContactFieldGroup title="Conversación" icon={<Calendar className="h-4 w-4" />}>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Estado:</span>{" "}
                <Badge variant={conversation.status === "active" ? "default" : "secondary"}>
                  {conversation.status === "active" ? "Activa" : "Archivada"}
                </Badge>
              </div>

              {conversation.state && (
                <div>
                  <span className="font-medium text-muted-foreground">Gestión:</span>{" "}
                  <Badge variant="outline">{conversation.state === "ia" ? "IA" : "Equipo"}</Badge>
                </div>
              )}

              {conversation.assigned_user && (
                <div>
                  <span className="font-medium text-muted-foreground">Asignado a:</span>{" "}
                  <span>{conversation.assigned_user.full_name}</span>
                </div>
              )}

              <div>
                <span className="font-medium text-muted-foreground">Creada:</span>{" "}
                <span>{format(new Date(conversation.created_at), "dd MMM yyyy, HH:mm", { locale: es })}</span>
              </div>

              {conversation.last_message_at && (
                <div>
                  <span className="font-medium text-muted-foreground">Último mensaje:</span>{" "}
                  <span>{format(new Date(conversation.last_message_at), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                </div>
              )}
            </div>
          </ContactFieldGroup>

          <Separator />

          {/* Tenant Comments */}
          <TenantCommentsDisplay contactId={contact.id} tenantId={conversation.tenant_id} />
        </div>
      </ScrollArea>
    </div>
  );
}
