/**
 * @fileoverview Status History Dialog Component
 * @description Modal dialog showing complete status change history for a contact
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Clock } from 'lucide-react';
import { useContactStatusHistory } from '../hooks/useContactStatusHistory';
import { StatusBadge } from './StatusBadge';

interface StatusHistoryDialogProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * StatusHistoryDialog - Shows complete audit trail of status changes
 *
 * @param contactId - Contact ID to fetch history for
 * @param contactName - Contact name for dialog title
 * @param open - Dialog open state
 * @param onOpenChange - Callback when dialog open state changes
 *
 * @example
 * const [showHistory, setShowHistory] = useState(false);
 * <StatusHistoryDialog
 *   contactId="contact-uuid"
 *   contactName="Juan Pérez"
 *   open={showHistory}
 *   onOpenChange={setShowHistory}
 * />
 */
export function StatusHistoryDialog({
  contactId,
  contactName,
  open,
  onOpenChange,
}: StatusHistoryDialogProps) {
  const { data: history, isLoading } = useContactStatusHistory(contactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de estados</DialogTitle>
          <DialogDescription>
            Cambios de estado para {contactName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando historial...
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((change) => (
                <div
                  key={change.id}
                  className="flex items-start gap-4 p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {change.previous_status ? (
                      <>
                        <StatusBadge status={change.previous_status} />
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Estado inicial
                      </span>
                    )}
                    {change.status ? (
                      <StatusBadge status={change.status} />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Sin estado
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(change.changed_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                    <div className="text-xs mt-1">
                      por {change.changed_by_email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay historial de cambios
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
