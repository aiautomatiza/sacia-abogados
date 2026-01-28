/**
 * @fileoverview Final step - Channel selection, template, and campaign launch
 * Works with both import and CRM contact sources
 */

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
import { useWhatsAppNumbers } from '@/features/conversations/hooks/useWhatsAppNumbers';
import { useWhatsAppTemplatesByWaba, useWhatsAppTemplates } from '@/features/conversations/hooks/useWhatsAppTemplates';
import type { CampaignWizardState, ContactSourceType, SelectedTemplate } from '../../types';

interface WizardStep4Props {
  state: CampaignWizardState;
  sourceType: ContactSourceType;
  contactCount: number;
  onChannelSelect: (channel: 'whatsapp' | 'llamadas') => void;
  onWhatsAppNumberSelect: (phoneNumberId: string, wabaId: string | null) => void;
  onTemplateSelect: (template: SelectedTemplate | null) => void;
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
  onLaunch,
  onBack,
  onNewCampaign,
}: WizardStep4Props) {
  const { data: whatsappNumbers = [], isLoading: loadingNumbers } = useWhatsAppNumbers();
  const activeNumbers = whatsappNumbers.filter(n => n.status === 'active');

  // Get templates filtered by WABA if available, otherwise all tenant templates
  const { data: templatesByWaba = [], isLoading: loadingTemplatesByWaba } = useWhatsAppTemplatesByWaba(
    state.selectedWhatsAppWabaId
  );
  const { data: allTemplates = [], isLoading: loadingAllTemplates } = useWhatsAppTemplates();

  // Use WABA-filtered templates if we have a WABA ID, otherwise use all templates
  const templates = state.selectedWhatsAppWabaId ? templatesByWaba : allTemplates;
  const loadingTemplates = state.selectedWhatsAppWabaId ? loadingTemplatesByWaba : loadingAllTemplates;

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
      onTemplateSelect({
        id: template.id,
        templateId: template.template_id,
        name: template.name,
        bodyText: template.body_text,
        headerText: template.header_text,
        footerText: template.footer_text,
      });
    } else {
      onTemplateSelect(null);
    }
  };

  const canLaunch =
    state.selectedChannel &&
    (state.selectedChannel !== 'whatsapp' || (state.selectedWhatsAppNumberId && state.selectedTemplate)) &&
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

            {/* Template Preview */}
            {state.selectedTemplate && (
              <Card className="p-3 bg-background">
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm font-medium">Vista previa de la plantilla</span>
                </div>
                <div className="space-y-1 text-sm">
                  {state.selectedTemplate.headerText && (
                    <p className="font-semibold">{state.selectedTemplate.headerText}</p>
                  )}
                  <p className="whitespace-pre-wrap">{state.selectedTemplate.bodyText}</p>
                  {state.selectedTemplate.footerText && (
                    <p className="text-xs text-muted-foreground">{state.selectedTemplate.footerText}</p>
                  )}
                </div>
              </Card>
            )}

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
