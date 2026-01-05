/**
 * @fileoverview Date Badge Component - ADAPTADO PARA TENANT-BASED
 * @description Badge showing date separator between message groups
 *
 * CAMBIOS vs original:
 * - Ninguno (componente simple sin referencias a clinic/account)
 */

interface DateBadgeProps {
  label: string;
}

export function DateBadge({ label }: DateBadgeProps) {
  return (
    <div className="flex justify-center my-4">
      <div className="bg-muted/70 text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
        {label}
      </div>
    </div>
  );
}
