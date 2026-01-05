import { Navigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import { ReactNode } from 'react';

interface UserClientRouteProps {
  children: ReactNode;
}

export function UserClientRoute({ children }: UserClientRouteProps) {
  const { role, loading } = useRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'user_client') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
