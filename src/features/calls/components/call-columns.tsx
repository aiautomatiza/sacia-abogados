/**
 * @fileoverview Call Columns
 * @description TanStack Table column definitions
 */

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Phone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppointmentIndicator } from "@/features/appointments";
import type { CallDetailed } from "../types/call.types";
import {
  formatCallDuration,
  formatCallState,
  formatCallType,
  formatCallDateTime,
  getCallStateColor,
  getCallTypeColor,
  getCallStateIcon,
  getCallTypeIcon,
  truncateText,
} from "../utils/call-formatters";

interface ColumnOptions {
  onSort?: (columnId: string) => void;
  showAppointments?: boolean;
}

export function getCallColumns(options: ColumnOptions = {}): ColumnDef<CallDetailed>[] {
  const { onSort, showAppointments = false } = options;

  const columns: ColumnDef<CallDetailed>[] = [
    {
      accessorKey: "call_datetime",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-sm"
          onClick={() => onSort?.("call_datetime")}
        >
          Fecha/Hora
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {formatCallDateTime(row.getValue("call_datetime"))}
        </span>
      ),
    },
    {
      accessorKey: "contact_name",
      header: () => <span className="text-sm">Contacto</span>,
      cell: ({ row }) => {
        const name = row.getValue("contact_name") as string | null;
        const phone = row.original.contact_phone;
        return (
          <span className="text-sm">
            <span className="font-medium">{name || "Sin nombre"}</span>
            {phone && <span className="text-muted-foreground"> • {phone}</span>}
          </span>
        );
      },
    },
    {
      accessorKey: "type",
      header: () => <span className="text-sm">Tipo</span>,
      cell: ({ row }) => {
        const type = row.getValue("type") as CallDetailed["type"];
        const Icon = getCallTypeIcon(type);
        return (
          <Badge
            variant="outline"
            className={cn("gap-1 px-2 py-0.5 text-xs", getCallTypeColor(type))}
          >
            <Icon className="h-3.5 w-3.5" />
            {formatCallType(type)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "state",
      header: () => <span className="text-sm">Estado</span>,
      cell: ({ row }) => {
        const state = row.getValue("state") as CallDetailed["state"];
        const Icon = getCallStateIcon(state);
        return (
          <Badge
            variant="outline"
            className={cn("gap-1 px-2 py-0.5 text-xs", getCallStateColor(state))}
          >
            <Icon className="h-3.5 w-3.5" />
            {formatCallState(state)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "duration_seconds",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-sm"
          onClick={() => onSort?.("duration_seconds")}
        >
          Duración
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const duration = row.getValue("duration_seconds") as number | null;
        return (
          <span className="text-sm tabular-nums">
            {formatCallDuration(duration)}
          </span>
        );
      },
    },
    {
      accessorKey: "summary",
      header: () => <span className="text-sm">Resumen</span>,
      cell: ({ row }) => {
        const summary = row.getValue("summary") as string | null;
        return (
          <span className="text-sm text-muted-foreground">
            {truncateText(summary, 40)}
          </span>
        );
      },
    },
    {
      accessorKey: "audio_url",
      header: "",
      cell: ({ row }) => {
        const audioUrl = row.getValue("audio_url") as string | null;
        if (!audioUrl) return null;
        return (
          <div className="flex justify-center">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      },
    },
  ];

  // Add appointments column if enabled
  if (showAppointments) {
    // Insert after contact_name column (index 1)
    columns.splice(2, 0, {
      id: "appointments",
      header: () => <span className="text-sm">Citas</span>,
      cell: ({ row }) => {
        const contactId = row.original.contact_id;
        if (!contactId) return null;
        return (
          <AppointmentIndicator
            contactId={contactId}
            size="sm"
            showTooltip
          />
        );
      },
    });
  }

  return columns;
}

export const callColumns = getCallColumns();
