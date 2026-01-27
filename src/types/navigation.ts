import { LucideIcon } from 'lucide-react';

/**
 * Módulos disponibles que pueden ser habilitados/deshabilitados por tenant.
 * Cada módulo se mapea a una configuración específica en tenant_settings.
 */
export type TenantModule = 'conversations' | 'calls' | 'campaigns';

export interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  group: string;
  badge?: string | number;
  disabled?: boolean;
  roles?: string[];
  /** Módulo requerido para mostrar este item. Si no se especifica, siempre es visible. */
  requiredModule?: TenantModule;
}
