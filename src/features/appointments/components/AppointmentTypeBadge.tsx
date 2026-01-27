import { Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentType } from "../types";

interface AppointmentTypeBadgeProps {
  type: AppointmentType;
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<
  AppointmentType,
  {
    label: string;
    icon: typeof Phone;
    className: string;
  }
> = {
  call: {
    label: "Llamada",
    icon: Phone,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  in_person: {
    label: "Presencial",
    icon: MapPin,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
};

export function AppointmentTypeBadge({
  type,
  showIcon = true,
  showLabel = true,
  className,
}: AppointmentTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-normal gap-1",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
