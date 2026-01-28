/**
 * @fileoverview New Campaign Page
 * @description Multi-step wizard for creating campaigns with CSV import or CRM selection
 */

import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  WizardStep1,
  WizardStep2,
  WizardStep3,
  WizardStep4,
  WizardStepSource,
  WizardStepContacts,
  CampaignStepper,
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
    goBackToSource,
    handleSourceSelect,
    handleFileSelect,
    handleMappingChange,
    handleImport,
    handleCrmContactsSelect,
    handleLaunchCampaign,
    handleChannelSelect,
    handleWhatsAppNumberSelect,
    handleTemplateSelect,
    resetWizard,
    getContactCount,
  } = useCampaignWizard({
    onSuccess: () => {
      toast.success('Campana creada exitosamente');
      navigate('/campaigns');
    },
  });

  // Loading state
  if (loadingSettings) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Campaigns disabled
  if (!campaignsEnabled) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <PageHeader
          title="Crear Nueva Campana"
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
            <h2 className="text-2xl font-semibold mb-2">Campanas no disponibles</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              Tu cuenta no tiene habilitado ningun canal de campanas. Para poder crear campanas,
              necesitas tener habilitado al menos uno de los siguientes canales:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-6">
              <li>Campanas de WhatsApp</li>
              <li>Campanas de Llamadas</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Contacta con tu administrador para habilitar estos canales.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Handle back navigation from launch step
  const handleBackFromLaunch = () => {
    if (state.sourceType === 'import') {
      goToStep('confirm');
    } else if (state.sourceType === 'crm') {
      goToStep('contacts');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <PageHeader
        title="Crear Nueva Campana"
        description="Selecciona contactos y lanza tu campana"
        actions={
          <Button variant="outline" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        }
      />

      {/* Stepper */}
      <div className="mb-6">
        <CampaignStepper
          currentStep={step}
          sourceType={state.sourceType}
          onStepClick={(clickedStep) => {
            // Only allow going back to previous steps
            if (state.sourceType === 'import') {
              const stepOrder = ['source', 'upload', 'mapping', 'confirm', 'launch'];
              const currentIndex = stepOrder.indexOf(step);
              const clickedIndex = stepOrder.indexOf(clickedStep);
              if (clickedIndex < currentIndex) {
                goToStep(clickedStep);
              }
            } else if (state.sourceType === 'crm') {
              const stepOrder = ['source', 'contacts', 'launch'];
              const currentIndex = stepOrder.indexOf(step);
              const clickedIndex = stepOrder.indexOf(clickedStep);
              if (clickedIndex < currentIndex) {
                goToStep(clickedStep);
              }
            }
          }}
        />
      </div>

      {/* Step Content */}
      <Card>
        {/* Source Selection */}
        {step === 'source' && (
          <WizardStepSource
            selectedSource={state.sourceType}
            onSelectSource={handleSourceSelect}
          />
        )}

        {/* Import Flow - Step 1: File Upload */}
        {step === 'upload' && (
          <WizardStep1
            onFileSelect={handleFileSelect}
            onBack={goBackToSource}
          />
        )}

        {/* Import Flow - Step 2: Column Mapping */}
        {step === 'mapping' && (
          <WizardStep2
            state={state}
            customFields={customFields}
            requiredFields={requiredFields}
            hasNumeroMapping={hasNumeroMapping}
            onMappingChange={handleMappingChange}
            onBack={() => goToStep('upload')}
            onNext={() => goToStep('confirm')}
          />
        )}

        {/* Import Flow - Step 3: Confirm Import */}
        {step === 'confirm' && (
          <WizardStep3
            state={state}
            onImport={handleImport}
            onBack={() => goToStep('mapping')}
          />
        )}

        {/* CRM Flow - Contact Selection */}
        {step === 'contacts' && (
          <WizardStepContacts
            onBack={goBackToSource}
            onNext={handleCrmContactsSelect}
          />
        )}

        {/* Final Step - Launch Campaign */}
        {step === 'launch' && (
          <WizardStep4
            state={state}
            sourceType={state.sourceType}
            contactCount={getContactCount()}
            onChannelSelect={handleChannelSelect}
            onWhatsAppNumberSelect={handleWhatsAppNumberSelect}
            onTemplateSelect={handleTemplateSelect}
            onLaunch={handleLaunchCampaign}
            onBack={handleBackFromLaunch}
            onNewCampaign={resetWizard}
          />
        )}
      </Card>
    </div>
  );
}
