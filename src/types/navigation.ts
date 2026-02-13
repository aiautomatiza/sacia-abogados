import { LucideIcon } from 'lucide-react';
import type { ComercialRole } from '@/types/comercial';

/**
 * Módulos disponibles que pueden ser habilitados/deshabilitados por tenant.
 * Cada módulo se mapea a una configuración específica en tenant_settings.
 */
export type TenantModule = 'conversations' | 'calls' | 'campaigns' | 'appointments';

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
  /** Comercial roles that should NOT see this item */
  hiddenForComercialRoles?: ComercialRole[];
  /** Comercial roles that CAN see this item (if set, only these roles see it; null = no comercial role) */
  visibleForComercialRoles?: (ComercialRole | null)[];
}
