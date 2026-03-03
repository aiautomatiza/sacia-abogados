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
import { getTemplateMappings, type WhatsAppTemplateRow } from "../services/whatsapp-templates.service";
import { useWhatsAppTemplatesForConversation } from "../hooks/useWhatsAppTemplates";
import type { ConversationWithContact } from "../types";

// Type guard for template variables
type TemplateVariable = { name: string; position: number };

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

  // Effect to load and apply variable mappings when a template is selected
  React.useEffect(() => {
    async function loadAndApplyMappings() {
      if (!currentTenant?.id || !selectedTemplateId || !contact) {
        // Only clear if we explicitly changed templates to null or another that hasn't loaded
        // Keep existing manual values while the new template is being selected/mapped manually
        return; 
      }

      try {
        const mappings = await getTemplateMappings(currentTenant.id, selectedTemplateId);
        
        if (mappings && mappings.length > 0) {
          const newVariableValues: Record<string, string> = {};
          
          mappings.forEach((mapping) => {
            const { position, source } = mapping;
            let value = "";
            
            if (source.type === 'static_value') {
              value = source.value || "";
            } else if (source.type === 'fixed_field') {
              if (source.field === 'nombre') {
                value = contact.nombre || "";
              } else if (source.field === 'numero') {
                value = contact.numero || "";
              }
            } else if (source.type === 'custom_field' && source.fieldName) {
              // Extract from attributes (custom fields)
              let attributes = contact.attributes as any;
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
              console.log(`[DEBUG] Mapping custom field ${source.fieldName}:`, { attributes, value });
            }
            
            newVariableValues[position.toString()] = value;
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
  }, [selectedTemplateId, currentTenant?.id, contact]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Función para extraer variables del texto si no están definidas en BD
  const extractVariablesFromText = (text: string): Array<{ name: string; position: number }> => {
    if (!text) return [];

    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];

    const positions = [...new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""))))];
    return positions
      .sort((a, b) => a - b)
      .map((pos) => ({
        name: `Variable ${pos}`,
        position: pos,
      }));
  };

  // Obtener variables (de BD o extraídas del texto)
  const getTemplateVariables = (): TemplateVariable[] => {
    if (!selectedTemplate) return [];

    // Si hay variables definidas en BD, usarlas
    if (selectedTemplate.variables && isVariablesArray(selectedTemplate.variables)) {
      return selectedTemplate.variables;
    }

    // Si no, extraer del texto
    const bodyVars = extractVariablesFromText(selectedTemplate.body_text);
    const headerVars = selectedTemplate.header_text ? extractVariablesFromText(selectedTemplate.header_text) : [];
    const footerVars = selectedTemplate.footer_text ? extractVariablesFromText(selectedTemplate.footer_text) : [];

    // Combinar y deduplicar por posición
    const allVars = [...bodyVars, ...headerVars, ...footerVars];
    const uniqueVars = allVars.reduce(
      (acc, curr) => {
        if (!acc.find((v) => v.position === curr.position)) {
          acc.push(curr);
        }
        return acc;
      },
      [] as Array<{ name: string; position: number }>,
    );

    return uniqueVars.sort((a, b) => a.position - b.position);
  };

  const templateVariables = getTemplateVariables();

  // Función para reemplazar variables en el texto
  const replaceVariables = (text: string): string => {
    if (!text) return text;

    let result = text;
    templateVariables.forEach((variable) => {
      const position = variable.position.toString();
      const value = variableValues[position];
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

  const handleVariableChange = (position: number, value: string) => {
    setVariableValues({
      ...variableValues,
      [position.toString()]: value,
    });
  };

  const handleSelectTemplate = async () => {
    if (!selectedTemplateId || !selectedTemplate) return;
    
    // Construir el contenido completo con variables reemplazadas
    const headerResolved = selectedTemplate.header_text ? replaceVariables(selectedTemplate.header_text) : "";
    const bodyResolved = replaceVariables(selectedTemplate.body_text);
    const footerResolved = selectedTemplate.footer_text ? replaceVariables(selectedTemplate.footer_text) : "";
    
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
                  <div key={variable.position} className="space-y-1">
                    <Label htmlFor={`var-${variable.position}`} className="text-xs text-muted-foreground">
                      {variable.name}
                    </Label>
                    <Input
                      id={`var-${variable.position}`}
                      placeholder={`Ingresa ${variable.name.toLowerCase()}...`}
                      value={variableValues[variable.position.toString()] || ""}
                      onChange={(e) => handleVariableChange(variable.position, e.target.value)}
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
                <p className="text-sm font-semibold">{replaceVariables(selectedTemplate.header_text)}</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{replaceVariables(selectedTemplate.body_text)}</p>
              {selectedTemplate.footer_text && (
                <p className="text-xs text-muted-foreground">{replaceVariables(selectedTemplate.footer_text)}</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
