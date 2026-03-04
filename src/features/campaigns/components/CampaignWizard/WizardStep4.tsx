/**
 * @fileoverview Final step - Channel selection, template, and campaign launch
 * Works with both import and CRM contact sources
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Users, Rocket, FileText, AlertCircle } from 'lucide-react';
import { ChannelSelector } from '../ChannelSelector';
import { TemplateVariableMapper } from './TemplateVariableMapper';
import { useWhatsAppNumbers } from '@/features/conversations/hooks/useWhatsAppNumbers';
import { useWhatsAppTemplatesByWaba, useWhatsAppTemplates } from '@/features/conversations/hooks/useWhatsAppTemplates';
import { useCustomFields } from '@/features/contacts';
import { useAuth } from '@/contexts/auth-context';
import { getTemplateMappings } from '@/features/conversations/services/whatsapp-templates.service';
import type { CampaignWizardState, ContactSourceType, SelectedTemplate, TemplateVariableMapping } from '../../types';

interface WizardStep4Props {
  state: CampaignWizardState;
  sourceType: ContactSourceType;
  contactCount: number;
  onChannelSelect: (channel: 'whatsapp' | 'llamadas') => void;
  onWhatsAppNumberSelect: (phoneNumberId: string, wabaId: string | null) => void;
  onTemplateSelect: (template: SelectedTemplate | null) => void;
  onVariableMappingChange: (mapping: TemplateVariableMapping[]) => void;
  onLaunch: () => void;
  onBack: () => void;
  onNewCampaign: () => void;
}

export function WizardStep4({
  state,
  sourceType,
  contactCount,
  onChannelSelect,
  onWhatsAppNumberSelect,
  onTemplateSelect,
  onVariableMappingChange,
  onLaunch,
  onBack,
  onNewCampaign,
}: WizardStep4Props) {
  const { scope } = useAuth();
  const { data: whatsappNumbers = [], isLoading: loadingNumbers } = useWhatsAppNumbers();
  const activeNumbers = whatsappNumbers.filter(n => n.status === 'active');

  // Load custom fields for variable mapping
  const { data: customFields = [] } = useCustomFields();

  // Get templates filtered by WABA if available, otherwise all tenant templates
  const { data: templatesByWaba = [], isLoading: loadingTemplatesByWaba } = useWhatsAppTemplatesByWaba(
    state.selectedWhatsAppWabaId
  );
  const { data: allTemplates = [], isLoading: loadingAllTemplates } = useWhatsAppTemplates();

  // Use WABA-filtered templates if we have a WABA ID, otherwise use all templates
  const templates = state.selectedWhatsAppWabaId ? templatesByWaba : allTemplates;
  const loadingTemplates = state.selectedWhatsAppWabaId ? loadingTemplatesByWaba : loadingAllTemplates;

  // Auto-load template mappings when template changes
  useEffect(() => {
    async function loadMappings() {
      if (!scope?.tenantId || !state.selectedTemplate?.id) return;
      try {
        const mappings = await getTemplateMappings(scope.tenantId, state.selectedTemplate.id);
        if (mappings && mappings.length > 0) {
          // @ts-ignore - The structure is identical but imported from different files
          onVariableMappingChange(mappings);
        }
      } catch (error) {
        console.error("Error loading template mappings:", error);
      }
    }
    
    // Only fetch if we have a selected template and mapping is currently empty
    if (state.selectedTemplate?.id && state.variableMapping.length === 0) {
      loadMappings();
    }
  }, [state.selectedTemplate?.id, scope?.tenantId, onVariableMappingChange, state.variableMapping.length]);

  const totalBatches = Math.ceil(contactCount / 20);
  const estimatedMinutes = totalBatches > 1 ? (totalBatches - 1) * 2 : 0;

  const selectedNumber = activeNumbers.find(n => n.phone_number_id === state.selectedWhatsAppNumberId);

  const handleNumberChange = (phoneNumberId: string) => {
    const number = activeNumbers.find(n => n.phone_number_id === phoneNumberId);
    onWhatsAppNumberSelect(phoneNumberId, number?.waba_id || null);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Helper: find which component a given position appears in (within the template texts)
      const detectComponent = (pos: number): 'HEADER' | 'BODY' | 'FOOTER' => {
        const placeholder = `{{${pos}}}`;
        if (template.header_text?.includes(placeholder)) return 'HEADER';
        if (template.footer_text?.includes(placeholder)) return 'FOOTER';
        return 'BODY';
      };

      const extractVars = (text: string | null, component: 'HEADER' | 'BODY' | 'FOOTER') => {
        if (!text) return [];
        const matches = text.match(/\{\{(\d+)\}\}/g);
        if (!matches) return [];
        const positions = [...new Set(matches.map(m => parseInt(m.replace(/[{}]/g, ''))))];
        return positions.sort((a, b) => a - b).map(pos => ({
          name: `Variable ${component} ${pos}`,
          position: pos,
          component
        }));
      };

      // Parse variables per component: if stored in DB, map with correct component detection
      let variables = Array.isArray(template.variables) && template.variables.length > 0
        ? template.variables.map((v: any) => ({
            name: v.name || '',
            position: v.position || 0,
            // If component explicitly stored, use it; otherwise detect from text
            component: v.component || detectComponent(v.position || 0),
          }))
        : [];

      // If no variables in the field at all, extract from texts
      if (variables.length === 0) {
        variables = [
          ...extractVars(template.header_text, 'HEADER'),
          ...extractVars(template.body_text, 'BODY'),
          ...extractVars(template.footer_text, 'FOOTER'),
        ];
      }

      onTemplateSelect({
        id: template.id,
        templateId: template.template_id,
        name: template.name,
        bodyText: template.body_text,
        headerText: template.header_text,
        footerText: template.footer_text,
        variables,
      });
    } else {
      onTemplateSelect(null);
    }
  };

  // Check if template has variables and all are mapped
  const hasTemplateVariables = (state.selectedTemplate?.variables?.length ?? 0) > 0;
  const allVariablesMapped = !hasTemplateVariables || state.variableMapping.every((m) => {
    if (m.source.type === 'static_value') return !!m.source.value;
    if (m.source.type === 'custom_field') return !!m.source.fieldName;
    return true;
  }) && state.variableMapping.length === (state.selectedTemplate?.variables?.length ?? 0);

  const canLaunch =
    state.selectedChannel &&
    (state.selectedChannel !== 'whatsapp' || (state.selectedWhatsAppNumberId && state.selectedTemplate && allVariablesMapped)) &&
    !state.loading &&
    contactCount > 0;

  return (
    <>
      <CardHeader>
        <CardTitle>Lanzar campana</CardTitle>
        <CardDescription>
          Selecciona el canal y lanza tu campana
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Contact Summary */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {contactCount.toLocaleString()} contactos seleccionados
              </p>
              <p className="text-sm text-muted-foreground">
                {sourceType === 'import'
                  ? 'Importados desde archivo'
                  : 'Seleccionados del CRM'}
              </p>
            </div>
          </div>

          {contactCount > 0 && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
              <p>
                Se enviaran en {totalBatches} {totalBatches === 1 ? 'lote' : 'lotes'} de 20 contactos
                {estimatedMinutes > 0 && ` (~${estimatedMinutes} min)`}
              </p>
            </div>
          )}
        </div>

        {/* Channel Selection */}
        <div>
          <h3 className="text-sm font-medium mb-3">Selecciona un canal:</h3>
          <ChannelSelector
            selectedChannel={state.selectedChannel}
            onSelectChannel={onChannelSelect}
          />
        </div>

        {/* WhatsApp Configuration */}
        {state.selectedChannel === 'whatsapp' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            {/* WhatsApp Number Selector */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">Numero de WhatsApp *</Label>
              <Select
                value={state.selectedWhatsAppNumberId || ''}
                onValueChange={handleNumberChange}
                disabled={loadingNumbers}
              >
                <SelectTrigger id="whatsapp-number">
                  <SelectValue placeholder="Selecciona un numero de WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  {activeNumbers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No hay numeros activos disponibles
                    </div>
                  ) : (
                    activeNumbers.map((number) => (
                      <SelectItem key={number.phone_number_id} value={number.phone_number_id}>
                        {number.alias} ({number.phone_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selector */}
            {state.selectedWhatsAppNumberId && (
              <div className="space-y-2">
                <Label htmlFor="whatsapp-template">Plantilla de mensaje *</Label>
                <Select
                  value={state.selectedTemplate?.id || ''}
                  onValueChange={handleTemplateChange}
                  disabled={loadingTemplates}
                >
                  <SelectTrigger id="whatsapp-template">
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTemplates ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Cargando plantillas...
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay plantillas aprobadas disponibles
                      </div>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo se muestran plantillas aprobadas por Meta
                </p>
              </div>
            )}

            {/* Template Variable Mapper and Preview */}
            {state.selectedTemplate && (() => {
               // Extract the first contact for preview from import data
               let previewContact: any = null;
               
               if (sourceType === 'import' && state.data.length > 0 && state.columns && state.mapping) {
                 const row = state.data[0];
                 const contactPreview: any = { attributes: {} };
                 state.columns.forEach((col, idx) => {
                   const value = row[idx];
                   if (state.mapping[col] === 'numero') {
                     contactPreview.numero = value;
                   } else if (state.mapping[col] === 'nombre') {
                     contactPreview.nombre = value;
                   } else if (state.mapping[col]?.startsWith('custom:')) {
                     const fieldName = state.mapping[col].replace('custom:', '');
                     contactPreview.attributes[fieldName] = value;
                   } else if (state.mapping[col] === 'custom') {
                     contactPreview.attributes[col] = value;
                   }
                 });
                 previewContact = contactPreview;
               }

               return (
                  <TemplateVariableMapper
                    variables={state.selectedTemplate.variables}
                    customFields={customFields}
                    mapping={state.variableMapping}
                    headerText={state.selectedTemplate.headerText}
                    bodyText={state.selectedTemplate.bodyText}
                    footerText={state.selectedTemplate.footerText}
                    onMappingChange={onVariableMappingChange}
                    previewContact={previewContact}
                  />
               );
            })()}

            {/* Warning if no templates */}
            {state.selectedWhatsAppNumberId && !loadingTemplates && templates.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">No hay plantillas disponibles</p>
                  <p className="text-xs mt-1">
                    Necesitas tener plantillas aprobadas por Meta para enviar campanas de WhatsApp.
                    {selectedNumber?.waba_id && ' Las plantillas deben estar asociadas a la misma cuenta WABA que el numero seleccionado.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-between sticky bottom-0 bg-background pt-4 pb-2 border-t mt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atras
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onNewCampaign}>
              Nueva campana
            </Button>
            <Button onClick={onLaunch} disabled={!canLaunch}>
              {state.loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Lanzar campana
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
}
