import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { CampaignWizardState } from '../../types';

interface WizardStep3Props {
  state: CampaignWizardState;
  onImport: () => void;
  onBack: () => void;
}

export function WizardStep3({ state, onImport, onBack }: WizardStep3Props) {
  if (state.stats) {
    // Show success stats after import
    return (
      <>
        <CardHeader>
          <CardTitle>✅ Importación completada</CardTitle>
          <CardDescription>Los contactos se han importado correctamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Total procesado:</strong> {state.stats.total}
            </p>
            <p className="text-sm">
              <strong>Contactos nuevos:</strong> {state.stats.created}
            </p>
            <p className="text-sm">
              <strong>Contactos actualizados:</strong> {state.stats.updated}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Continúa al siguiente paso para seleccionar el canal y lanzar la campaña.
          </p>
        </CardContent>
      </>
    );
  }

  // Show confirmation before import
  return (
    <>
      <CardHeader>
        <CardTitle>Paso 3: Confirmar e importar</CardTitle>
        <CardDescription>Revisa el resumen antes de importar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        <div className="space-y-2">
          <p className="text-sm">
            <strong>Total de filas a importar:</strong> {state.data.length}
          </p>
          <p className="text-sm">
            <strong>Columna de número:</strong>{' '}
            {state.columns.find((col) => state.mapping[col] === 'numero')}
          </p>
          <p className="text-sm">
            <strong>Columna de nombre:</strong>{' '}
            {state.columns.find((col) => state.mapping[col] === 'nombre') || 'N/A'}
          </p>
          <p className="text-sm">
            <strong>Atributos personalizados:</strong>{' '}
            {state.columns.filter((col) => state.mapping[col] === 'custom').join(', ') || 'Ninguno'}
          </p>
        </div>

        <div className="flex gap-2 justify-between sticky bottom-0 bg-background pt-4 pb-2 border-t mt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
          <Button onClick={onImport} disabled={state.loading}>
            {state.loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar Contactos
          </Button>
        </div>
      </CardContent>
    </>
  );
}
