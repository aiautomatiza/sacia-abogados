import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSyncLogs } from '../hooks/useSyncLogs';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SyncHistoryTableProps {
  integrationId?: string;
}

export function SyncHistoryTable({ integrationId }: SyncHistoryTableProps) {
  const { data, isLoading } = useSyncLogs(integrationId);

  if (isLoading) {
    return <div className="text-center py-4">Cargando historial...</div>;
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay registros de sincronización
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Operación</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Procesados</TableHead>
          <TableHead>Fallidos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </TableCell>
            <TableCell className="capitalize">
              {log.operation.replace('_', ' ')}
            </TableCell>
            <TableCell>
              <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                {log.status}
              </Badge>
            </TableCell>
            <TableCell>{log.processed_records}</TableCell>
            <TableCell>{log.failed_records > 0 && <span className="text-destructive">{log.failed_records}</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
