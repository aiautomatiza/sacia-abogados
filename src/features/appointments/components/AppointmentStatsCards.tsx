import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Phone,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentStats } from "../types";

interface AppointmentStatsCardsProps {
  stats: AppointmentStats | null;
  isLoading?: boolean;
}

export function AppointmentStatsCards({
  stats,
  isLoading,
}: AppointmentStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: "Total",
      value: stats.total,
      description: `${stats.scheduled + stats.confirmed} pendientes`,
      icon: Calendar,
      iconColor: "text-blue-600",
    },
    {
      title: "Completadas",
      value: stats.completed,
      description: `${stats.completion_rate.toFixed(1)}% tasa de completado`,
      icon: CheckCircle2,
      iconColor: "text-green-600",
    },
    {
      title: "Canceladas",
      value: stats.cancelled,
      description: `${stats.cancellation_rate.toFixed(1)}% tasa de cancelacion`,
      icon: XCircle,
      iconColor: "text-red-600",
    },
    {
      title: "No presentados",
      value: stats.no_show,
      description: `${stats.no_show_rate.toFixed(1)}% tasa de no-show`,
      icon: AlertCircle,
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Version compacta para mostrar en linea
export function AppointmentStatsInline({
  stats,
  isLoading,
}: AppointmentStatsCardsProps) {
  if (isLoading || !stats) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <Calendar className="h-4 w-4" />
        <span>{stats.total} total</span>
      </div>
      <div className="flex items-center gap-1">
        <Phone className="h-4 w-4 text-blue-600" />
        <span>{stats.calls_count} llamadas</span>
      </div>
      <div className="flex items-center gap-1">
        <MapPin className="h-4 w-4 text-purple-600" />
        <span>{stats.in_person_count} presenciales</span>
      </div>
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>{stats.avg_duration_minutes.toFixed(0)} min promedio</span>
      </div>
    </div>
  );
}
