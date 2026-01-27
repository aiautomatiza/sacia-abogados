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
import { X, Phone, Calendar, MapPin, User, Tag, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ContactFieldGroup } from "./contact-info/ContactFieldGroup";
import { EditableContactField } from "./contact-info/EditableContactField";
import { TenantCommentsDisplay } from "./contact-info/ClinicCommentsDisplay";
import { TagSelector } from "./contact-info/TagSelector";
import { useCustomFields } from "@/features/contacts/hooks/useCustomFields";
import { useAppointmentsEnabled } from "@/hooks/useTenantSettings";
import {
  ContactUpcomingAppointments,
  AppointmentFormDialog,
  AppointmentDetailModal,
} from "@/features/appointments";
import type { AppointmentDetailed } from "@/features/appointments";
import type { ConversationWithContact } from "../types";

interface Props {
  conversation: ConversationWithContact;
  onClose?: () => void;
  onUpdateContact?: (contactId: string, updates: Record<string, any>) => Promise<void>;
  onUpdateTags?: (conversationId: string, tags: string[]) => Promise<void>;
}

export function ContactInfoPanel({ conversation, onClose, onUpdateContact, onUpdateTags }: Props) {
  const { contact } = conversation;
  const { data: customFields = [] } = useCustomFields();
  const { isEnabled: appointmentsEnabled } = useAppointmentsEnabled();

  // Estado para citas
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetailed | null>(null);

  const handleUpdateField = async (field: string, value: any) => {
    if (!onUpdateContact) return;

    try {
      await onUpdateContact(contact.id, { [field]: value });
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleTagsChange = async (tags: string[]) => {
    if (!onUpdateTags) return;

    try {
      await onUpdateTags(conversation.id, tags);
    } catch (error) {
      console.error("Error updating tags:", error);
    }
  };

  // Extract email from attributes if exists
  const email = contact.attributes?.email || null;

  // Sort custom fields by display_order for consistent rendering
  const sortedCustomFields = [...customFields].sort(
    (a, b) => a.display_order - b.display_order
  );

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
            <TagSelector
              selectedTags={conversation.tags || []}
              onTagsChange={handleTagsChange}
              disabled={!onUpdateTags}
            />
          </ContactFieldGroup>

          <Separator />

          {/* Custom Fields - Show all defined fields with proper labels */}
          {sortedCustomFields.length > 0 && (
            <>
              <ContactFieldGroup title="Información adicional" icon={<MapPin className="h-4 w-4" />}>
                <div className="space-y-2">
                  {sortedCustomFields.map((field) => {
                    // Skip email as it's shown above
                    if (field.field_name === "email") return null;

                    const value = contact.attributes?.[field.field_name];

                    // Format value based on field type
                    let displayValue: string;
                    if (value === undefined || value === null || value === "") {
                      displayValue = "-";
                    } else if (field.field_type === "checkbox") {
                      displayValue = value ? "Sí" : "No";
                    } else if (field.field_type === "date" && value) {
                      try {
                        displayValue = format(new Date(value), "dd MMM yyyy", { locale: es });
                      } catch {
                        displayValue = String(value);
                      }
                    } else {
                      displayValue = String(value);
                    }

                    return (
                      <div key={field.id} className="text-sm">
                        <span className="font-medium text-muted-foreground">{field.field_label}:</span>{" "}
                        <span>{displayValue}</span>
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

          {/* Citas - Solo si el módulo está habilitado */}
          {appointmentsEnabled && (
            <>
              <ContactFieldGroup title="Citas" icon={<CalendarDays className="h-4 w-4" />}>
                <ContactUpcomingAppointments
                  contactId={contact.id}
                  limit={3}
                  onCreateClick={() => setIsAppointmentFormOpen(true)}
                  onAppointmentClick={(apt) => setSelectedAppointment(apt)}
                  showHeader={false}
                  compact
                />
              </ContactFieldGroup>
              <Separator />
            </>
          )}

          {/* Tenant Comments */}
          <TenantCommentsDisplay contactId={contact.id} tenantId={conversation.tenant_id} />
        </div>
      </ScrollArea>

      {/* Diálogos de citas */}
      {appointmentsEnabled && (
        <>
          <AppointmentFormDialog
            open={isAppointmentFormOpen}
            onOpenChange={setIsAppointmentFormOpen}
            preSelectedContactId={contact.id}
            preSelectedContactName={contact.nombre}
            preSelectedContactPhone={contact.numero}
          />

          <AppointmentDetailModal
            appointment={selectedAppointment}
            open={!!selectedAppointment}
            onOpenChange={(open) => {
              if (!open) setSelectedAppointment(null);
            }}
          />
        </>
      )}
    </div>
  );
}
