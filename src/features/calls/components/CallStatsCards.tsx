/**
 * @fileoverview Call Stats Cards
 * @description KPI cards for call statistics
 */

import { Phone, CheckCircle, XCircle, Clock } from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallStats } from "../types/call.types";
import { formatCallDuration } from "../utils/call-formatters";

interface CallStatsCardsProps {
  stats: CallStats | null;
  isLoading?: boolean;
}

export function CallStatsCards({ stats, isLoading = false }: CallStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="bg-sidebar rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-sidebar rounded-xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Phone className="h-5 w-5" />}
          label="Total llamadas"
          value={stats.total.toLocaleString("es-ES")}
          variant="blue-dark"
        />
        <KPICard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Completadas"
          value={stats.completed.toLocaleString("es-ES")}
          variant="blue-medium"
          badge={
            stats.total > 0
              ? { label: `${Math.round((stats.completed / stats.total) * 100)}%` }
              : undefined
          }
        />
        <KPICard
          icon={<XCircle className="h-5 w-5" />}
          label="Fallidas / Perdidas"
          value={(stats.failed + stats.missed).toLocaleString("es-ES")}
          variant="blue-light"
        />
        <KPICard
          icon={<Clock className="h-5 w-5" />}
          label="Duración promedio"
          value={formatCallDuration(stats.avg_duration)}
          variant="blue-sky"
        />
      </div>
    </div>
  );
}
