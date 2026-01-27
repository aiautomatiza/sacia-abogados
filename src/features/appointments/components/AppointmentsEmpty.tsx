import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppointmentsEmptyProps {
  hasFilters?: boolean;
  onCreateClick?: () => void;
  onClearFilters?: () => void;
}

export function AppointmentsEmpty({
  hasFilters = false,
  onCreateClick,
  onClearFilters,
}: AppointmentsEmptyProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          No se encontraron citas
        </h3>
        <p className="text-muted-foreground max-w-sm mb-4">
          No hay citas que coincidan con los filtros aplicados.
          Prueba a ajustar los criterios de busqueda.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        No hay citas programadas
      </h3>
      <p className="text-muted-foreground max-w-sm mb-4">
        Aun no tienes ninguna cita programada.
        Crea tu primera cita para comenzar a gestionar tu agenda.
      </p>
      {onCreateClick && (
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Crear primera cita
        </Button>
      )}
    </div>
  );
}
