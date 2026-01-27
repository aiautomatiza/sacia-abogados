/**
 * @fileoverview Appointment Columns
 * @description TanStack Table column definitions for appointments
 */

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Phone, MapPin, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppointmentDetailed } from "../types";
import { AppointmentTypeBadge } from "./AppointmentTypeBadge";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import {
  formatAppointmentDate,
  formatDuration,
  formatContactDisplay,
  formatAssignment,
} from "../utils/appointment-formatters";

interface ColumnOptions {
  onSort?: (columnId: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
}

export function getAppointmentColumns(
  options: ColumnOptions = {}
): ColumnDef<AppointmentDetailed>[] {
  const { onSort, onStatusChange, onCancel, onReschedule } = options;

  return [
    {
      accessorKey: "scheduled_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-sm"
          onClick={() => onSort?.("scheduled_at")}
        >
          Fecha/Hora
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {formatAppointmentDate(row.getValue("scheduled_at"))}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDuration(row.original.duration_minutes)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "contact_name",
      header: () => <span className="text-sm">Contacto</span>,
      cell: ({ row }) => {
        const name = formatContactDisplay(row.original);
        const phone = row.original.contact_phone;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{name}</span>
            {phone && (
              <span className="text-xs text-muted-foreground">{phone}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: () => <span className="text-sm">Tipo</span>,
      cell: ({ row }) => (
        <AppointmentTypeBadge type={row.getValue("type")} size="sm" />
      ),
    },
    {
      accessorKey: "status",
      header: () => <span className="text-sm">Estado</span>,
      cell: ({ row }) => (
        <AppointmentStatusBadge status={row.getValue("status")} size="sm" />
      ),
    },
    {
      accessorKey: "assignment",
      header: () => <span className="text-sm">Asignacion</span>,
      cell: ({ row }) => {
        const appointment = row.original;
        const isCall = appointment.type === "call";
        const Icon = isCall ? Phone : MapPin;

        return (
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{formatAssignment(appointment)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "title",
      header: () => <span className="text-sm">Titulo</span>,
      cell: ({ row }) => {
        const title = row.getValue("title") as string | null;
        return (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
            {title || "-"}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const appointment = row.original;
        const canModify =
          appointment.status !== "completed" &&
          appointment.status !== "cancelled";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canModify && (
                <>
                  <DropdownMenuItem
                    onClick={() => onStatusChange?.(appointment.id, "confirmed")}
                    disabled={appointment.status === "confirmed"}
                  >
                    Confirmar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onStatusChange?.(appointment.id, "in_progress")
                    }
                    disabled={appointment.status === "in_progress"}
                  >
                    Marcar en curso
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onStatusChange?.(appointment.id, "completed")
                    }
                  >
                    Marcar completada
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onReschedule?.(appointment.id)}
                  >
                    Reprogramar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onCancel?.(appointment.id)}
                    className="text-destructive"
                  >
                    Cancelar
                  </DropdownMenuItem>
                </>
              )}
              {!canModify && (
                <DropdownMenuItem disabled>
                  No hay acciones disponibles
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export const appointmentColumns = getAppointmentColumns();
