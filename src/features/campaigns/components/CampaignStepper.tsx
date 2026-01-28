/**
 * @fileoverview Campaign Wizard Stepper Component
 * @description Visual progress indicator for the campaign creation wizard
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep, ContactSourceType } from '../types';

interface StepConfig {
  key: WizardStep;
  label: string;
  shortLabel: string;
}

const IMPORT_STEPS: StepConfig[] = [
  { key: 'source', label: 'Origen', shortLabel: 'Origen' },
  { key: 'upload', label: 'Subir archivo', shortLabel: 'Archivo' },
  { key: 'mapping', label: 'Mapear columnas', shortLabel: 'Mapeo' },
  { key: 'confirm', label: 'Confirmar', shortLabel: 'Confirmar' },
  { key: 'launch', label: 'Lanzar', shortLabel: 'Lanzar' },
];

const CRM_STEPS: StepConfig[] = [
  { key: 'source', label: 'Origen', shortLabel: 'Origen' },
  { key: 'contacts', label: 'Seleccionar contactos', shortLabel: 'Contactos' },
  { key: 'launch', label: 'Lanzar', shortLabel: 'Lanzar' },
];

function getStepIndex(steps: StepConfig[], currentStep: WizardStep): number {
  return steps.findIndex((s) => s.key === currentStep);
}

interface CampaignStepperProps {
  currentStep: WizardStep;
  sourceType: ContactSourceType;
  onStepClick?: (step: WizardStep) => void;
  completedSteps?: WizardStep[];
}

export function CampaignStepper({
  currentStep,
  sourceType,
  onStepClick,
  completedSteps = [],
}: CampaignStepperProps) {
  // If no source selected, show minimal stepper
  const steps = sourceType === 'import' ? IMPORT_STEPS :
                sourceType === 'crm' ? CRM_STEPS :
                [{ key: 'source' as WizardStep, label: 'Origen', shortLabel: 'Origen' }];

  const currentIndex = getStepIndex(steps, currentStep);

  const isStepCompleted = (step: WizardStep) => completedSteps.includes(step);
  const isStepActive = (step: WizardStep) => step === currentStep;
  const isStepClickable = (stepIndex: number) => {
    // Can only go back to completed steps
    return stepIndex < currentIndex && onStepClick;
  };

  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-center">
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(step.key) || index < currentIndex;
          const isActive = isStepActive(step.key);
          const isClickable = isStepClickable(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex items-center">
              {/* Step circle and label */}
              <div
                className={cn(
                  'flex flex-col items-center',
                  isClickable && 'cursor-pointer'
                )}
                onClick={() => isClickable && onStepClick?.(step.key)}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
                    isCompleted && !isActive && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isActive && 'text-primary',
                    !isActive && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-12 lg:w-20 h-0.5 mx-2',
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view - compact */}
      <div className="flex sm:hidden items-center justify-center gap-1">
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(step.key) || index < currentIndex;
          const isActive = isStepActive(step.key);

          return (
            <div
              key={step.key}
              className={cn(
                'h-2 rounded-full transition-all',
                isActive ? 'w-8 bg-primary' : 'w-2',
                isCompleted && !isActive && 'bg-primary',
                !isCompleted && !isActive && 'bg-muted'
              )}
            />
          );
        })}
      </div>

      {/* Mobile step label */}
      <div className="flex sm:hidden justify-center mt-2">
        <span className="text-sm font-medium text-primary">
          {steps[currentIndex]?.label || 'Origen'}
        </span>
      </div>
    </div>
  );
}
