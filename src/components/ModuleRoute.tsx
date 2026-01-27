import { Navigate } from 'react-router-dom';
import { useModuleAccess } from '@/hooks/useTenantSettings';
import { ReactNode } from 'react';
import type { TenantModule } from '@/types/navigation';

interface ModuleRouteProps {
  children: ReactNode;
  /** Módulo requerido para acceder a esta ruta */
  module: TenantModule;
  /** Ruta de redirección si el módulo no está habilitado (default: /contacts) */
  redirectTo?: string;
}

/**
 * Componente de ruta protegida que verifica si un módulo del tenant está habilitado.
 * Si el módulo no está habilitado, redirige al usuario a una ruta por defecto.
 */
export function ModuleRoute({ children, module, redirectTo = '/contacts' }: ModuleRouteProps) {
  const { isLoading, isModuleEnabled } = useModuleAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isModuleEnabled(module)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
