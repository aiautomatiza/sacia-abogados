import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { 
  getTemplateMappings, 
  saveTemplateMappings,
  type WhatsAppTemplate,
  type TemplateVariableMapping
} from '../services/whatsapp-templates.service';
import { useWhatsAppTemplates } from '../hooks/useWhatsAppTemplates';
import { TemplateVariableMapper } from '@/features/campaigns/components/CampaignWizard/TemplateVariableMapper';
import { useCustomFields } from '@/features/contacts/hooks/useCustomFields';

export function TemplateSettingsTab() {
  const { scope } = useAuth();
  const currentTenant = scope?.tenantId ? { id: scope.tenantId } : null;
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<TemplateVariableMapping[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Use the standard hook used across the app (like in campaigns)
  const { data: rawTemplates = [], isLoading: isLoadingTemplates } = useWhatsAppTemplates();

  // Format templates to ensure variables are correctly extracted
  const templates = React.useMemo(() => {
    return rawTemplates.map((template) => {
      // Helper: detect which component a position appears in
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

      // Parse variables per component: if stored in DB use detectComponent when missing
      let variables = Array.isArray(template.variables) && template.variables.length > 0
        ? template.variables.map((v: any) => ({
            name: v.name || '',
            position: v.position || 0,
            component: v.component || detectComponent(v.position || 0),
          }))
        : [];

      // If no variables in the field, extract from texts
      if (variables.length === 0) {
        variables = [
          ...extractVars(template.header_text, 'HEADER'),
          ...extractVars(template.body_text, 'BODY'),
          ...extractVars(template.footer_text, 'FOOTER'),
        ];
      }

      return {
        ...template,
        variables
      } as WhatsAppTemplate;
    });
  }, [rawTemplates]);

  // Fetch custom fields for the variable mapper
  const { data: customFields = [] } = useCustomFields(currentTenant?.id);

  // Load mappings when a template is selected
  useEffect(() => {
    async function loadMappings() {
      if (!currentTenant?.id || !selectedTemplateId) return;
      setIsLoadingMappings(true);
      try {
        const data = await getTemplateMappings(currentTenant.id, selectedTemplateId);
        setMappings(data);
      } catch (error) {
        console.error("Error loading template mappings:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las configuraciones de la plantilla.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMappings(false);
      }
    }
    loadMappings();
  }, [currentTenant?.id, selectedTemplateId, toast]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSave = async () => {
    console.log('[DEBUG] handleSave triggered', { currentTenantId: currentTenant?.id, selectedTemplateId, mappings });
    if (!currentTenant?.id || !selectedTemplateId) {
      console.log('[DEBUG] handleSave aborted: missing tenant or template ID');
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('[DEBUG] Calling saveTemplateMappings...');
      await saveTemplateMappings(currentTenant.id, selectedTemplateId, mappings);
      console.log('[DEBUG] saveTemplateMappings succeeded');
      toast({
        title: "Éxito",
        description: "Configuración guardada correctamente.",
      });
    } catch (error) {
      console.error("[DEBUG] Error saving template mappings:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      console.log('[DEBUG] handleSave finished');
    }
  };

  if (isLoadingTemplates) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Plantillas de WhatsApp</h2>
        <p className="text-muted-foreground text-sm">
          Configura los valores por defecto para las variables de tus plantillas de WhatsApp. 
          Estos valores se auto-completarán cuando uses una plantilla en el chat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector de plantillas */}
        <div className="md:col-span-1 border-r pr-6 space-y-4">
          <h3 className="text-sm font-medium">Seleccionar Plantilla</h3>
          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplateId === template.id ? 'default' : 'outline'}
                className="w-full justify-start text-left h-auto py-3 relative truncate"
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <div className="flex flex-col items-start truncate w-full pr-4">
                  <span className="font-medium truncate block w-full">{template.name}</span>
                  <span className="text-xs opacity-70 mt-1">{template.category}</span>
                </div>
              </Button>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-md">
                No hay plantillas aprobadas.
              </div>
            )}
          </div>
        </div>

        {/* Configuración de la plantilla */}
        <div className="md:col-span-2">
          {selectedTemplate ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedTemplate.name}
                </h3>
                <Button onClick={handleSave} disabled={isSaving || isLoadingMappings}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Configuración
                </Button>
              </div>

              <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                <TemplateVariableMapper
                  variables={selectedTemplate.variables || []}
                  customFields={customFields}
                  // @ts-ignore - The structure is identical but imported from different files
                  mapping={mappings}
                  headerText={selectedTemplate.header_text}
                  bodyText={selectedTemplate.body_text}
                  footerText={selectedTemplate.footer_text}
                  onMappingChange={setMappings}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground pt-12">
              <p>Selecciona una plantilla para configurar sus variables.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
