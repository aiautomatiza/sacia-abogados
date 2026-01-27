import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationsEmptyStateProps {
  onCreateClick?: () => void;
}

export function LocationsEmptyState({ onCreateClick }: LocationsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No hay sedes configuradas</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Las sedes te permiten gestionar múltiples ubicaciones para tus citas
        presenciales. Crea tu primera sede para comenzar.
      </p>
      {onCreateClick && (
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Crear primera sede
        </Button>
      )}
    </div>
  );
}
