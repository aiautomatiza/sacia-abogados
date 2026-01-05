/**
 * @fileoverview WhatsApp Templates Hook with WABA Filtering
 * @description Hook for fetching WhatsApp message templates filtered by WABA
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  listTemplatesByScope,
  listTemplatesForConversation,
  listTemplatesByWaba,
} from "../services/whatsapp-templates.service";

/**
 * Hook to fetch all approved templates for tenant (no WABA filter)
 * Use this for admin panels or when WABA context not available
 */
export function useWhatsAppTemplates() {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-templates", scope],
    queryFn: () => listTemplatesByScope(scope),
    enabled: !!scope,
  });
}

/**
 * Hook to fetch templates filtered by conversation's WABA
 * Use this in TemplateSelector when sending messages
 * @param conversationId - ID of the conversation
 */
export function useWhatsAppTemplatesForConversation(conversationId: string | null) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-templates", "conversation", conversationId, scope?.tenantId],
    queryFn: () => {
      if (!scope?.tenantId || !conversationId) {
        throw new Error("Missing tenant or conversation ID");
      }
      return listTemplatesForConversation(scope.tenantId, conversationId);
    },
    enabled: !!scope?.tenantId && !!conversationId,
  });
}

/**
 * Hook to fetch templates for specific WABA
 * Use this when you already know the WABA ID
 * @param wabaId - WhatsApp Business Account ID
 */
export function useWhatsAppTemplatesByWaba(wabaId: string | null) {
  const { scope } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-templates", "waba", wabaId, scope?.tenantId],
    queryFn: () => {
      if (!scope?.tenantId || !wabaId) {
        throw new Error("Missing tenant or WABA ID");
      }
      return listTemplatesByWaba(scope.tenantId, wabaId);
    },
    enabled: !!scope?.tenantId && !!wabaId,
  });
}
