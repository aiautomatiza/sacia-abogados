import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  WizardStep1,
  WizardStep2,
  WizardStep3,
  WizardStep4,
  useCampaignWizard,
} from '@/features/campaigns';
import { useCustomFields } from '@/features/contacts';
import { useCampaignsEnabled } from '@/hooks/useTenantSettings';

export default function NewCampaign() {
  const navigate = useNavigate();
  const { data: customFields = [] } = useCustomFields();
  const { enabled: campaignsEnabled, isLoading: loadingSettings } = useCampaignsEnabled();

  const {
    step,
    state,
    requiredFields,
    hasNumeroMapping,
    goToStep,
    handleFileSelect,
    handleMappingChange,
    handleImport,
    handleLaunchCampaign,
    handleChannelSelect,
    handleWhatsAppNumberSelect,
    resetWizard,
  } = useCampaignWizard({
    onSuccess: () => {
      toast.success('Campaña creada exitosamente');
      navigate('/campaigns');
    },
  });

  // Show loading state
  if (loadingSettings) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show disabled message if no campaigns are enabled
  if (!campaignsEnabled) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <PageHeader
          title="Crear Nueva Campaña"
          actions={
            <Button variant="outline" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          }
        />
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Campañas no disponibles</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              Tu cuenta no tiene habilitado ningún canal de campañas. Para poder crear campañas,
              necesitas tener habilitado al menos uno de los siguientes canales:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-6">
              <li>• Campañas de WhatsApp</li>
              <li>• Campañas de Llamadas</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Contacta con tu administrador para habilitar estos canales.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <PageHeader
        title="Crear Nueva Campaña"
        description="Importa contactos y lanza tu campaña"
        actions={
          <Button variant="outline" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        }
      />

      {/* Wizard Steps Indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              "h-2 w-12 rounded-full transition-colors",
              step >= s ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step Content */}
      <Card>
        {step === 1 && <WizardStep1 onFileSelect={handleFileSelect} />}
        {step === 2 && (
          <WizardStep2
            state={state}
            customFields={customFields}
            requiredFields={requiredFields}
            hasNumeroMapping={hasNumeroMapping}
            onMappingChange={handleMappingChange}
            onBack={() => goToStep(1)}
            onNext={() => goToStep(3)}
          />
        )}
        {step === 3 && (
          <WizardStep3
            state={state}
            onImport={handleImport}
            onBack={() => goToStep(2)}
          />
        )}
        {step === 4 && (
          <WizardStep4
            state={state}
            onChannelSelect={handleChannelSelect}
            onWhatsAppNumberSelect={handleWhatsAppNumberSelect}
            onLaunch={handleLaunchCampaign}
            onNewCampaign={resetWizard}
          />
        )}
      </Card>
    </div>
  );
}
