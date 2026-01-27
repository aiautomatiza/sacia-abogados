/**
 * @fileoverview Appointments Table
 * @description DataTable wrapper for appointments
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
import type { AppointmentDetailed, AppointmentStatus } from "../types";
import { getAppointmentColumns } from "./appointment-columns";

interface AppointmentsTableProps {
  appointments: AppointmentDetailed[];
  isLoading?: boolean;
  onRowClick?: (appointment: AppointmentDetailed) => void;
  onSort?: (columnId: string) => void;
  onRowHover?: (appointmentId: string) => void;
  onStatusChange?: (id: string, status: AppointmentStatus) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
  density?: "comfortable" | "compact";
}

export function AppointmentsTable({
  appointments,
  isLoading = false,
  onRowClick,
  onSort,
  onRowHover,
  onStatusChange,
  onCancel,
  onReschedule,
  density = "comfortable",
}: AppointmentsTableProps) {
  const columns = useMemo(
    () =>
      getAppointmentColumns({
        onSort,
        onStatusChange: onStatusChange
          ? (id, status) => onStatusChange(id, status as AppointmentStatus)
          : undefined,
        onCancel,
        onReschedule,
      }),
    [onSort, onStatusChange, onCancel, onReschedule]
  );

  const table = useReactTable({
    data: appointments,
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
                No hay citas para mostrar
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  density === "compact" ? "h-14" : "h-16",
                  row.original.status === "cancelled" && "opacity-60"
                )}
                onClick={() => onRowClick?.(row.original)}
                onMouseEnter={() => onRowHover?.(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(density === "compact" ? "py-2" : "py-3")}
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
