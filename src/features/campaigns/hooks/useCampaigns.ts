import { useQuery } from '@tanstack/react-query';
import * as campaignService from '../services/campaign.service';
import * as campaignsApi from '@/lib/api/endpoints/campaigns.api';
import type { CampaignFilters } from '../types';

const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useCampaigns(filters: CampaignFilters = {}, page: number = 1) {
  return useQuery({
    queryKey: ['campaigns', filters, page],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const response = await campaignsApi.getCampaigns(filters, page, 50);
        return {
          data: response.campaigns,
          total: response.total,
        };
      } else {
        // OLD: Direct Supabase
        return campaignService.getCampaigns(filters, page, 50);
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        return campaignsApi.getCampaign(id);
      } else {
        // OLD: Direct Supabase
        return campaignService.getCampaign(id);
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useCampaignContacts(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-contacts', campaignId],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        // NEW: API Gateway
        const response = await campaignsApi.getCampaignContacts(campaignId);
        return response.contacts;
      } else {
        // OLD: Direct Supabase
        return campaignService.getCampaignContacts(campaignId);
      }
    },
    enabled: !!campaignId,
    staleTime: 1000 * 60,
  });
}
