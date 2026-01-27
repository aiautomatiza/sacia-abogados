import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TenantLocation } from "../types";
import { parseOperatingHours, DAYS_OF_WEEK } from "../types";

interface LocationCardProps {
  location: TenantLocation;
  onEdit?: (location: TenantLocation) => void;
  onDelete?: (location: TenantLocation) => void;
  onSetDefault?: (location: TenantLocation) => void;
  onToggleActive?: (location: TenantLocation, isActive: boolean) => void;
}

export function LocationCard({
  location,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleActive,
}: LocationCardProps) {
  const operatingHours = parseOperatingHours(location.operating_hours);

  // Obtener horario de hoy
  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase() as keyof typeof operatingHours;
  const todaySchedule = operatingHours[today];

  // Formatear dirección completa
  const fullAddress = [
    location.address_line1,
    location.address_line2,
    location.city,
    location.state_province,
    location.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className={cn(
        "relative transition-all hover:shadow-md",
        !location.is_active && "opacity-60 bg-muted/30"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{location.name}</h3>
              {location.is_default && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Principal
                </Badge>
              )}
            </div>
            {location.code && (
              <p className="text-sm text-muted-foreground">
                Código: {location.code}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={location.is_active ? "default" : "secondary"}>
              {location.is_active ? "Activa" : "Inactiva"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(location)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!location.is_default && (
                  <DropdownMenuItem onClick={() => onSetDefault?.(location)}>
                    <Star className="h-4 w-4 mr-2" />
                    Establecer como principal
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onToggleActive?.(location, !location.is_active)}
                >
                  {location.is_active ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Activar
                    </>
                  )}
                </DropdownMenuItem>
                {!location.is_default && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(location)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Dirección */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <span>{fullAddress || "Sin dirección"}</span>
        </div>

        {/* Teléfono */}
        {location.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{location.phone}</span>
          </div>
        )}

        {/* Email */}
        {location.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{location.email}</span>
          </div>
        )}

        {/* Horario de hoy */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {todaySchedule
              ? `Hoy: ${todaySchedule.open} - ${todaySchedule.close}`
              : "Cerrado hoy"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
