import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const kpiCardVariants = cva(
  "rounded-lg border p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
  {
    variants: {
      variant: {
        primary: "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10",
        success: "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
        warning: "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10",
        info: "border-info/20 bg-gradient-to-br from-info/5 to-info/10",
        destructive: "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10",
        // Blue scale variants - using the AIAutomatiza brand blues
        "blue-dark": "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10", // #054AA7
        "blue-medium": "border-[hsl(223_33%_51%)]/20 bg-gradient-to-br from-[hsl(223_33%_51%)]/5 to-[hsl(223_33%_51%)]/10", // #5970AC
        "blue-light": "border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10", // #5471F3
        "blue-sky": "border-info/20 bg-gradient-to-br from-info/5 to-info/10", // #5471F3 (alternative)
      },
      interactive: {
        true: "cursor-pointer hover:shadow-glow",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      interactive: false,
    },
  }
);

interface KPICardProps extends VariantProps<typeof kpiCardVariants> {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
  };
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  progress?: number;
  benchmark?: {
    label: string;
    value: string | number;
  };
  onClick?: () => void;
  className?: string;
}

export function KPICard({
  icon,
  label,
  value,
  trend,
  badge,
  progress,
  benchmark,
  onClick,
  variant,
  interactive,
  className,
}: KPICardProps) {
  const isPositiveTrend = trend && trend.value >= 0;
  
  return (
    <div
      className={cn(
        kpiCardVariants({ variant, interactive: interactive || !!onClick }),
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn(
              "p-2 rounded-lg",
              variant === "primary" && "bg-primary/10 text-primary",
              variant === "success" && "bg-success/10 text-success",
              variant === "warning" && "bg-warning/10 text-warning",
              variant === "info" && "bg-info/10 text-info",
              variant === "destructive" && "bg-destructive/10 text-destructive",
              variant === "blue-dark" && "bg-primary/10 text-primary",
              variant === "blue-medium" && "bg-[hsl(223_33%_51%)]/10 text-[hsl(223_33%_51%)]",
              variant === "blue-light" && "bg-secondary/10 text-secondary",
              variant === "blue-sky" && "bg-info/10 text-info"
            )}>
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        
        {badge && (
          <Badge variant={badge.variant || "default"} className="text-xs">
            {badge.label}
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositiveTrend ? "text-success" : "text-destructive"
            )}>
              {isPositiveTrend ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && (
                <span className="text-xs text-muted-foreground ml-1">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        
        {progress !== undefined && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress}% del objetivo
            </p>
          </div>
        )}
        
        {benchmark && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">{benchmark.label}</span>
            <span className="text-sm font-semibold">{benchmark.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}
