import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ContactPreviewProps {
  data: any[][];
  columns: string[];
  maxRows?: number;
}

export function ContactPreview({ data, columns, maxRows = 5 }: ContactPreviewProps) {
  const previewData = data.slice(0, maxRows);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx} className="whitespace-nowrap">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx} className="whitespace-nowrap">{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.length > maxRows && (
        <div className="p-2 text-sm text-muted-foreground text-center border-t bg-background">
          ... y {data.length - maxRows} filas más
        </div>
      )}
    </div>
  );
}
