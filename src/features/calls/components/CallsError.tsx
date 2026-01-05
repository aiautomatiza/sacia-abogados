/**
 * @fileoverview Calls Error Component
 * @description Error state display for calls module
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CallsErrorProps {
  error: Error | null;
  onRetry: () => void;
}

export function CallsError({ error, onRetry }: CallsErrorProps) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error al cargar las llamadas</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p className="text-sm">
          {error?.message || "Ha ocurrido un error inesperado. Por favor, intenta de nuevo."}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}
