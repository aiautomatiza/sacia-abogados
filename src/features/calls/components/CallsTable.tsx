/**
 * @fileoverview Calls Table
 * @description DataTable wrapper for calls
 */

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppointmentsEnabled } from "@/hooks/useTenantSettings";
import type { CallDetailed } from "../types/call.types";
import { getCallColumns } from "./call-columns";

interface CallsTableProps {
  calls: CallDetailed[];
  isLoading?: boolean;
  onRowClick?: (call: CallDetailed) => void;
  onSort?: (columnId: string) => void;
  onRowHover?: (callId: string) => void;
  density?: "comfortable" | "compact";
}

export function CallsTable({
  calls,
  isLoading = false,
  onRowClick,
  onSort,
  onRowHover,
  density = "comfortable",
}: CallsTableProps) {
  const { isEnabled: appointmentsEnabled } = useAppointmentsEnabled();
  const columns = useMemo(
    () => getCallColumns({ onSort, showAppointments: appointmentsEnabled }),
    [onSort, appointmentsEnabled]
  );

  const table = useReactTable({
    data: calls,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No hay llamadas para mostrar
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  density === "compact" ? "h-14" : "h-16"
                )}
                onClick={() => onRowClick?.(row.original)}
                onMouseEnter={() => onRowHover?.(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      density === "compact" ? "py-2" : "py-3"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
