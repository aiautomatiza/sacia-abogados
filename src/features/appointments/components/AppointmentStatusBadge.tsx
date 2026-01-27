import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  CalendarX,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "../types";

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "default";
  className?: string;
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
  }
> = {
  scheduled: {
    label: "Programada",
    icon: Clock,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  confirmed: {
    label: "Confirmada",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  in_progress: {
    label: "En curso",
    icon: PlayCircle,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  completed: {
    label: "Completada",
    icon: CheckCircle2,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  cancelled: {
    label: "Cancelada",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  no_show: {
    label: "No presentado",
    icon: AlertCircle,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  rescheduled: {
    label: "Reprogramada",
    icon: RefreshCw,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
};

export function AppointmentStatusBadge({
  status,
  showIcon = true,
  showLabel = true,
  size = "default",
  className,
}: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-normal gap-1",
        config.className,
        size === "sm" && "text-xs px-1.5 py-0",
        className
      )}
    >
      {showIcon && (
        <Icon className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
      )}
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
