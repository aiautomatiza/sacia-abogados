import { Navigate } from 'react-router-dom';
import { useComercialRole } from '@/hooks/useComercialRole';
import type { ComercialRole } from '@/types/comercial';
import { ReactNode } from 'react';

interface ComercialRouteProps {
  children: ReactNode;
  /** If set, users with these roles are blocked from accessing */
  blockedRoles?: ComercialRole[];
  /** If set, only users with these roles (or null) can access */
  allowedRoles?: (ComercialRole | null)[];
  /** Where to redirect if access denied (default: /contacts) */
  redirectTo?: string;
}

export function ComercialRoute({
  children,
  blockedRoles,
  allowedRoles,
  redirectTo = '/contacts',
}: ComercialRouteProps) {
  const { comercialRole, isLoading } = useComercialRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Check blocked roles
  if (blockedRoles && comercialRole && blockedRoles.includes(comercialRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(comercialRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
