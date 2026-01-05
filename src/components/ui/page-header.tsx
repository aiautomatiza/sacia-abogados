import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  badges,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 mb-8", className)}>
      {breadcrumbs && <div className="text-sm">{breadcrumbs}</div>}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground">
              {title}
            </h1>
            {badges && <div className="flex items-center gap-2">{badges}</div>}
          </div>
          {description && (
            <p className="text-base text-muted-foreground">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
