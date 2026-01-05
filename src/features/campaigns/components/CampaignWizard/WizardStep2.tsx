import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ContactPreview } from '../ContactPreview';
import { ColumnMappingTable } from '../ColumnMappingTable';
import type { CampaignWizardState } from '../../types';
import type { CustomField } from '@/features/contacts/types';

interface WizardStep2Props {
  state: CampaignWizardState;
  customFields: CustomField[];
  requiredFields: CustomField[];
  hasNumeroMapping: boolean;
  onMappingChange: (column: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function WizardStep2({
  state,
  customFields,
  requiredFields,
  hasNumeroMapping,
  onMappingChange,
  onBack,
  onNext,
}: WizardStep2Props) {
  return (
    <>
      <CardHeader>
        <CardTitle>Paso 2: Mapear columnas</CardTitle>
        <CardDescription>
          Define cómo se mapean las columnas del archivo a los campos del contacto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        {state.file && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Archivo:</strong> {state.file.name}
              <span className="ml-2">
                ({state.file.size > 1024 * 1024
                  ? `${(state.file.size / 1024 / 1024).toFixed(2)} MB`
                  : `${(state.file.size / 1024).toFixed(2)} KB`})
              </span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Filas:</strong> {state.data.length} | <strong>Columnas:</strong> {state.columns.length}
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium mb-2">Vista previa:</h3>
          <ContactPreview data={state.data} columns={state.columns} />
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Mapeo de columnas:</h3>
          <ColumnMappingTable
            columns={state.columns}
            mapping={state.mapping}
            onMappingChange={onMappingChange}
            customFields={customFields}
            requiredFields={requiredFields}
          />
        </div>

        {!hasNumeroMapping && (
          <p className="text-sm text-destructive">
            ⚠️ Debe mapear al menos una columna a "Número"
          </p>
        )}

        <div className="flex gap-2 justify-between sticky bottom-0 bg-background pt-4 pb-2 border-t mt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
          <Button onClick={onNext} disabled={!hasNumeroMapping}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </>
  );
}
