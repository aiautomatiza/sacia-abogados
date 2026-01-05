import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

export function FileUploader({ onFileSelect }: FileUploaderProps) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const validTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isValidExtension = ['csv', 'xlsx', 'xls'].includes(fileExtension || '');
        
        if (validTypes.includes(file.type) || isValidExtension) {
          onFileSelect(file);
        } else {
          toast.error('Formato de archivo no soportado. Use CSV o Excel (.xlsx, .xls)');
        }
      }
    },
    [onFileSelect]
  );

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Subir archivo CSV o Excel</h3>
      <p className="text-sm text-muted-foreground mb-1">
        Arrastra y suelta tu archivo aquí o haz clic para seleccionar
      </p>
      <p className="text-xs text-muted-foreground/70 mb-4">
        Formatos soportados: CSV, XLSX, XLS
      </p>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />
      <Button asChild>
        <label htmlFor="file-upload" className="cursor-pointer">
          Seleccionar Archivo
        </label>
      </Button>
    </div>
  );
}
