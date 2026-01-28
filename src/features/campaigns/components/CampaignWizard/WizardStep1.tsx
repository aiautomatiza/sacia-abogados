import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { FileUploader } from '../FileUploader';

interface WizardStep1Props {
  onFileSelect: (file: File) => void;
  onBack: () => void;
}

export function WizardStep1({ onFileSelect, onBack }: WizardStep1Props) {
  return (
    <>
      <CardHeader>
        <CardTitle>Subir archivo</CardTitle>
        <CardDescription>
          Selecciona el archivo CSV o Excel con los contactos de tu campana
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUploader onFileSelect={onFileSelect} />
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cambiar origen
        </Button>
      </CardFooter>
    </>
  );
}
