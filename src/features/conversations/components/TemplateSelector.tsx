/**
 * @fileoverview Template Selector Component - ADAPTADO PARA TENANT-BASED
 * @description Selector for WhatsApp message templates with preview
 *
 * CAMBIOS vs original:
 * - Ninguno (componente genérico, templates ya filtrados por tenant en hook)
 */

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getTemplateMappings, type WhatsAppTemplateRow } from "../services/whatsapp-templates.service";
import { useWhatsAppTemplatesForConversation } from "../hooks/useWhatsAppTemplates";
import type { ConversationWithContact } from "../types";

// Type guard for template variables
type TemplateVariable = { name: string; position: number; component: string };

const isVariablesArray = (v: unknown): v is TemplateVariable[] => {
  return (
    Array.isArray(v) &&
    v.every((item) => typeof item === "object" && item !== null && "name" in item && "position" in item)
  );
};

export interface TemplateSelectionData {
  templateId: string;
  templateExternalId: string; // template_id para el webhook
  templateName: string;
  resolvedContent: string; // Texto con variables reemplazadas
  variableValues: Record<string, string>;
}

interface TemplateSelectorProps {
  conversationId: string;
  contact: ConversationWithContact['contact'];
  onSelect: (data: TemplateSelectionData) => Promise<void>;
  onCancel: () => void;
}

export function TemplateSelector({ conversationId, contact, onSelect, onCancel }: TemplateSelectorProps) {
  const { scope } = useAuth();
  const currentTenant = scope?.tenantId ? { id: scope.tenantId } : null;
  const { data: templates = [], isLoading } = useWhatsAppTemplatesForConversation(conversationId);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [variableValues, setVariableValues] = React.useState<Record<string, string>>({});
  const [contactWithLocation, setContactWithLocation] = React.useState(contact);

  // Fetch location details if missing but location_id exists
  React.useEffect(() => {
    async function fetchLocation() {
      if (contact?.location_id && !contact.location) {
        const { data: locationData } = await supabase
          .from('tenant_locations')
          .select('*')
          .eq('id', contact.location_id)
          .single();
        
        if (locationData) {
          setContactWithLocation({
            ...contact,
            location: locationData
          });
        }
      } else {
        setContactWithLocation(contact);
      }
    }
    fetchLocation();
  }, [contact]);

  // Effect to load and apply variable mappings when a template is selected
  React.useEffect(() => {
    async function loadAndApplyMappings() {
      if (!currentTenant?.id || !selectedTemplateId || !contactWithLocation) {
        // Only clear if we explicitly changed templates to null or another that hasn't loaded
        // Keep existing manual values while the new template is being selected/mapped manually
        return; 
      }

      try {
        const mappings = await getTemplateMappings(currentTenant.id, selectedTemplateId);
        
        if (mappings && mappings.length > 0) {
          const newVariableValues: Record<string, string> = {};
          
          // Helper: detect which component a given position belongs to (for legacy mappings)
          const detectComponent = (pos: number): "HEADER" | "BODY" | "FOOTER" => {
            const placeholder = `{{${pos}}}`;
            if (selectedTemplate?.header_text?.includes(placeholder)) return "HEADER";
            if (selectedTemplate?.footer_text?.includes(placeholder)) return "FOOTER";
            return "BODY";
          };

          mappings.forEach((mapping) => {
            const { position, source, component } = mapping;
            let value = "";
            
            if (source.type === 'static_value') {
              value = source.value || "";
            } else if (source.type === 'fixed_field') {
              if (source.field === 'nombre') {
                value = contactWithLocation.nombre || "";
              } else if (source.field === 'numero') {
                value = contactWithLocation.numero || "";
              }
            } else if ((source as any).type === 'location_field') {
              // Extract from contact's location if available
              const field = (source as any).field;
              const location = contactWithLocation.location;
              if (location && location[field]) {
                value = String(location[field]);
              } else {
                value = ""; // Or some placeholder
              }
            } else if (source.type === 'custom_field' && source.fieldName) {
              // Extract from attributes (custom fields)
              let attributes = contactWithLocation.attributes as any;
              if (typeof attributes === 'string') {
                try {
                  attributes = JSON.parse(attributes);
                } catch {
                  attributes = {};
                }
              }
              
              if (attributes) {
                // Exact match
                if (attributes[source.fieldName] !== undefined) {
                  value = attributes[source.fieldName];
                } else {
                  // Fallback: case-insensitive match
                  const matchingKey = Object.keys(attributes).find(
                    k => k.toLowerCase() === source.fieldName!.toLowerCase()
                  );
                  if (matchingKey) {
                    value = attributes[matchingKey];
                  }
                }
              }
              value = value || "";
            }
            
            const targetComponent = component || detectComponent(position);
            const key = `${targetComponent}-${position}`;
            newVariableValues[key] = value;
          });
          
          setVariableValues(newVariableValues);
        } else {
          // If no mappings found, reset to empty
          setVariableValues({});
        }
      } catch (error) {
        console.error("Error loading template mappings:", error);
      }
    }

    loadAndApplyMappings();
  }, [selectedTemplateId, currentTenant?.id, contactWithLocation]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Función para extraer variables del texto si no están definidas en BD
  const extractVariablesFromText = (
    text: string | null,
    component: "HEADER" | "BODY" | "FOOTER"
  ): TemplateVariable[] => {
    if (!text) return [];

    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];

    const positions = [...new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""))))];
    return positions
      .sort((a, b) => a - b)
      .map((pos) => ({
        name: `Variable ${component} ${pos}`,
        position: pos,
        component,
      }));
  };

  // Obtener variables (de BD o extraídas del texto)
  const getTemplateVariables = (): TemplateVariable[] => {
    if (!selectedTemplate) return [];

    // Helper: detect which component a given position belongs to
    const detectComponent = (pos: number): "HEADER" | "BODY" | "FOOTER" => {
      const placeholder = `{{${pos}}}`;
      // CRITICAL: We need to know which occurrences we are looking for.
      // If the same index exists in multiple components, this helper is ambiguous.
      // But for display purposes, we check in order:
      if (selectedTemplate.header_text?.includes(placeholder)) return "HEADER";
      if (selectedTemplate.body_text?.includes(placeholder)) return "BODY";
      if (selectedTemplate.footer_text?.includes(placeholder)) return "FOOTER";
      return "BODY";
    };

    // Si hay variables definidas en BD, usarlas con detectComponent como fallback
    if (selectedTemplate.variables && isVariablesArray(selectedTemplate.variables)) {
      return selectedTemplate.variables.map((v) => ({
        name: v.name || "",
        position: v.position,
        component: (v as any).component || detectComponent(v.position),
      }));
    }

    // Si no, extraer del texto (manteniendo separadas por componente)
    const vars = [
      ...extractVariablesFromText(selectedTemplate.header_text, "HEADER"),
      ...extractVariablesFromText(selectedTemplate.body_text, "BODY"),
      ...extractVariablesFromText(selectedTemplate.footer_text, "FOOTER"),
    ];

    // De-duplicate by both component and position
    return vars.filter((v, index, self) => 
      index === self.findIndex((t) => t.position === v.position && t.component === v.component)
    );
  };

  const templateVariables = getTemplateVariables();

  // Función para reemplazar variables en el texto
  const replaceVariables = (text: string, component: string): string => {
    if (!text) return text;

    let result = text;
    const componentVariables = templateVariables.filter((v) => v.component === component);

    componentVariables.forEach((variable) => {
      const position = variable.position.toString();
      const key = `${component}-${position}`;
      const value = variableValues[key];
      const placeholder = `{{${position}}}`;
      
      let safeValue = placeholder;
      if (value !== undefined && value !== null && value !== '') {
        safeValue = value;
      } else {
        safeValue = `[${variable.name}]`;
      }
      
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), safeValue);
    });

    return result;
  };

  const handleVariableChange = (position: number, component: string, value: string) => {
    setVariableValues({
      ...variableValues,
      [`${component}-${position}`]: value,
    });
  };

  const handleSelectTemplate = async () => {
    if (!selectedTemplateId || !selectedTemplate) return;
    
    // Construir el contenido completo con variables reemplazadas
    const headerResolved = selectedTemplate.header_text ? replaceVariables(selectedTemplate.header_text, "HEADER") : "";
    const bodyResolved = replaceVariables(selectedTemplate.body_text, "BODY");
    const footerResolved = selectedTemplate.footer_text ? replaceVariables(selectedTemplate.footer_text, "FOOTER") : "";
    
    const resolvedContent = [headerResolved, bodyResolved, footerResolved]
      .filter(Boolean)
      .join("\n\n");
    
    await onSelect({
      templateId: selectedTemplate.id,
      templateExternalId: selectedTemplate.template_id,
      templateName: selectedTemplate.name,
      resolvedContent,
      variableValues,
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando plantillas...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-2">
          No hay plantillas disponibles para este número de WhatsApp
        </p>
        <p className="text-xs text-muted-foreground">
          Las plantillas deben estar en la misma cuenta de WhatsApp Business (WABA) que el número usado en esta conversación.
        </p>
        <Button variant="outline" size="sm" onClick={onCancel} className="mt-4">
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Seleccionar plantilla</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <div>
        <Label htmlFor="template">Plantilla de WhatsApp</Label>
        <Select value={selectedTemplateId ?? ""} onValueChange={setSelectedTemplateId}>
          <SelectTrigger id="template">
            <SelectValue placeholder="Selecciona una plantilla..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <>
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSelectTemplate} disabled={!selectedTemplateId} className="flex-1">
              Enviar plantilla
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>

          {/* Variables Input */}
          {templateVariables.length > 0 && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Label className="text-sm font-medium">Variables de la plantilla</Label>
              <div className="space-y-3">
                {templateVariables.map((variable) => (
                  <div key={`${variable.component}-${variable.position}`} className="space-y-1">
                    <Label htmlFor={`var-${variable.component}-${variable.position}`} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal border">
                        {variable.component}
                      </span>
                      {variable.name}
                    </Label>
                    <Input
                      id={`var-${variable.component}-${variable.position}`}
                      placeholder={`Ingresa ${variable.name.toLowerCase()}...`}
                      value={variableValues[`${variable.component}-${variable.position}`] || ""}
                      onChange={(e) => handleVariableChange(variable.position, variable.component as string, e.target.value)}
                      className="bg-background"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview de la plantilla:</p>
              {selectedTemplate.header_text && (
                <p className="text-sm font-semibold whitespace-pre-wrap">{replaceVariables(selectedTemplate.header_text, "HEADER")}</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{replaceVariables(selectedTemplate.body_text, "BODY")}</p>
              {selectedTemplate.footer_text && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{replaceVariables(selectedTemplate.footer_text, "FOOTER")}</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
