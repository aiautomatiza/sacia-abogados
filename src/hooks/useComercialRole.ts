import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getComercialPermissions } from '@/types/comercial';
import type { ComercialRole, ComercialPermissions } from '@/types/comercial';

export function useComercialRole() {
  const { scope, loading } = useAuth();

  const comercialRole = scope?.comercialRole ?? null;
  const locationId = scope?.locationId ?? null;

  const permissions = useMemo<ComercialPermissions>(
    () => getComercialPermissions(comercialRole),
    [comercialRole]
  );

  return {
    comercialRole,
    locationId,
    permissions,
    isDirectorGeneral: comercialRole === 'director_comercial_general',
    isDirectorSede: comercialRole === 'director_sede',
    isComercial: comercialRole === 'comercial',
    hasComercialRole: comercialRole !== null,
    isLoading: loading,
  };
}
