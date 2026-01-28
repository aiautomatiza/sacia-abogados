/**
 * @fileoverview Selected Contacts Summary Component
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, X } from 'lucide-react';

interface SelectedContactsSummaryProps {
  selectedCount: number;
  totalContacts: number;
  selectAllFiltered: boolean;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
}

export function SelectedContactsSummary({
  selectedCount,
  totalContacts,
  selectAllFiltered,
  onSelectAllFiltered,
  onClearSelection,
}: SelectedContactsSummaryProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Selecciona los contactos para tu campana</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalContacts} contactos disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {selectedCount.toLocaleString()} contactos seleccionados
          </span>
        </div>

        {selectAllFiltered ? (
          <Badge variant="secondary">Todos los filtrados</Badge>
        ) : selectedCount < totalContacts ? (
          <Button
            variant="link"
            size="sm"
            className="text-primary p-0 h-auto"
            onClick={onSelectAllFiltered}
          >
            Seleccionar todos ({totalContacts.toLocaleString()})
          </Button>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Limpiar
      </Button>
    </div>
  );
}
