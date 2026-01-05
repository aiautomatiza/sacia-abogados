import { useQuery } from '@tanstack/react-query';
import * as campaignService from '../services/campaign.service';
import type { CampaignFilters } from '../types';

export function useCampaigns(filters: CampaignFilters = {}, page: number = 1) {
  return useQuery({
    queryKey: ['campaigns', filters, page],
    queryFn: () => campaignService.getCampaigns(filters, page, 50),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getCampaign(id),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useCampaignContacts(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-contacts', campaignId],
    queryFn: () => campaignService.getCampaignContacts(campaignId),
    enabled: !!campaignId,
    staleTime: 1000 * 60,
  });
}
