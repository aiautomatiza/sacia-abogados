import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook to get the current user's profile and tenant information
 */
export const useProfile = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, tenant_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    profile: query.data,
    tenantId: query.data?.tenant_id || null,
    isLoading: query.isLoading,
    error: query.error,
  };
};
