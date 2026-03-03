import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { 
  listApprovedTemplates, 
  getTemplateMappings, 
  saveTemplateMappings,
  type WhatsAppTemplate,
  type TemplateVariableMapping
} from '../services/whatsapp-templates.service';
import { TemplateVariableMapper } from '@/features/campaigns/components/CampaignWizard/TemplateVariableMapper';
import { useCustomFields } from '@/features/contacts/hooks/useCustomFields';

export function TemplateSettingsTab() {
  const { currentTenant } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<TemplateVariableMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch custom fields for the variable mapper
  const { data: customFields = [] } = useCustomFields(currentTenant?.id);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      if (!currentTenant?.id) return;
      setIsLoading(true);
      try {
        const data = await listApprovedTemplates(currentTenant.id);
        setTemplates(data);
      } catch (error) {
        console.error("Error loading templates:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las plantillas de WhatsApp.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadTemplates();
  }, [currentTenant?.id, toast]);

  // Load mappings when a template is selected
  useEffect(() => {
    async function loadMappings() {
      if (!currentTenant?.id || !selectedTemplateId) return;
      setIsLoading(true);
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
        setIsLoading(false);
      }
    }
    loadMappings();
  }, [currentTenant?.id, selectedTemplateId, toast]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSave = async () => {
    if (!currentTenant?.id || !selectedTemplateId) return;
    
    setIsSaving(true);
    try {
      await saveTemplateMappings(currentTenant.id, selectedTemplateId, mappings);
      toast({
        title: "Éxito",
        description: "Configuración guardada correctamente.",
      });
    } catch (error) {
      console.error("Error saving template mappings:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && templates.length === 0) {
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
          <div className="space-y-2">
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
                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Configuración
                </Button>
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
                <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border">
                  <TemplateVariableMapper
                    variables={selectedTemplate.variables}
                    customFields={customFields}
                    mapping={mappings}
                    bodyText={selectedTemplate.body_text}
                    onMappingChange={setMappings}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                  <p>Esta plantilla no tiene variables configurables.</p>
                </div>
              )}
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
