import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploader } from '../FileUploader';

interface WizardStep1Props {
  onFileSelect: (file: File) => void;
}

export function WizardStep1({ onFileSelect }: WizardStep1Props) {
  return (
    <>
      <CardHeader>
        <CardTitle>Paso 1: Subir archivo</CardTitle>
        <CardDescription>
          Selecciona el archivo CSV o Excel con los contactos de tu campaña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUploader onFileSelect={onFileSelect} />
      </CardContent>
    </>
  );
}
