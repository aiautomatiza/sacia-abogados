import { Navigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import { ReactNode } from 'react';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { role, loading } = useRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'super_admin') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
