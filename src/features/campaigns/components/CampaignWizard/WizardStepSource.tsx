/**
 * @fileoverview Wizard Step for Source Selection
 * @description First step where user chooses between CSV import or CRM selection
 */

import { Upload, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ContactSourceType } from '../../types';

interface WizardStepSourceProps {
  selectedSource: ContactSourceType;
  onSelectSource: (source: 'import' | 'crm') => void;
}

export function WizardStepSource({
  selectedSource,
  onSelectSource,
}: WizardStepSourceProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Selecciona el origen de contactos</CardTitle>
        <CardDescription>
          Elige como agregar los contactos a tu campana
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Import CSV/Excel Option */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg',
              selectedSource === 'import' && 'ring-2 ring-primary'
            )}
            onClick={() => onSelectSource('import')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Importar archivo</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Sube un archivo CSV o Excel con tus contactos. Los contactos se
                importaran automaticamente al CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Contactos nuevos se crearan automaticamente</li>
                <li>- Contactos existentes se actualizaran</li>
                <li>- Soporta CSV, XLSX y XLS</li>
              </ul>
            </CardContent>
          </Card>

          {/* Select from CRM Option */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg',
              selectedSource === 'crm' && 'ring-2 ring-primary'
            )}
            onClick={() => onSelectSource('crm')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Seleccionar del CRM</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Elige contactos existentes de tu base de datos con filtros
                avanzados y segmentacion.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Filtra por estado, fecha y mas</li>
                <li>- Seleccion individual o masiva</li>
                <li>- Vista previa de contactos</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </>
  );
}
