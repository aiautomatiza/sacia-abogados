/**
 * @fileoverview Calls Empty State
 * @description Empty state component when no calls exist
 */

import { PhoneOff, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallsEmptyProps {
  hasFilters?: boolean;
  onResetFilters?: () => void;
}

export function CallsEmpty({ hasFilters = false, onResetFilters }: CallsEmptyProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No se encontraron llamadas
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          No hay llamadas que coincidan con los filtros seleccionados. 
          Intenta ajustar los criterios de búsqueda.
        </p>
        {onResetFilters && (
          <Button variant="outline" onClick={onResetFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <PhoneOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No hay llamadas
      </h3>
      <p className="text-muted-foreground text-center max-w-md">
        Aún no se han registrado llamadas en el sistema. 
        Las llamadas aparecerán aquí cuando se realicen.
      </p>
    </div>
  );
}
