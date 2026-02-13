/**
 * @fileoverview Auth Context Provider
 * @description Provides authentication state and user scope to the application
 */

import React, { createContext, useContext, useMemo } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { useAuth as useAuthHook } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import type { UserScope } from "@/features/conversations";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  scope: UserScope | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading: authLoading, signOut } = useAuthHook();
  const { profile, isLoading: profileLoading } = useProfile();
  const { role, loading: roleLoading, isSuperAdmin } = useRole();

  const scope = useMemo<UserScope | null>(() => {
    if (!user || !profile?.tenant_id) return null;
    return {
      userId: user.id,
      tenantId: profile.tenant_id,
      isSuperAdmin: isSuperAdmin,
      comercialRole: profile.comercial_role ?? null,
      locationId: profile.location_id ?? null,
    };
  }, [user, profile, isSuperAdmin]);

  const value: AuthContextValue = {
    user,
    session,
    loading: authLoading || profileLoading || roleLoading,
    signOut,
    scope,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
