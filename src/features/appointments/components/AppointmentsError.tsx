import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AppointmentsErrorProps {
  error?: Error | null;
  onRetry?: () => void;
}

export function AppointmentsError({ error, onRetry }: AppointmentsErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error al cargar citas</AlertTitle>
        <AlertDescription>
          {error?.message || "Ha ocurrido un error al cargar las citas. Por favor, intenta de nuevo."}
        </AlertDescription>
      </Alert>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
