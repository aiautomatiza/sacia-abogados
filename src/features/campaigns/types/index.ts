export interface Campaign {
  id: string;
  tenant_id: string;
  channel: 'whatsapp' | 'llamadas';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_contacts: number;
  total_batches: number;
  batches_sent: number;
  batches_failed: number;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  updated_at: string | null;
}

export interface CampaignBatch {
  id: string;
  campaign_id: string;
  batch_number: number;
  total_batches: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  scheduled_for: string;
  processed_at: string | null;
  contacts: CampaignContact[];
}

export interface CampaignContact {
  id: string;
  nombre: string | null;
  numero: string;
  attributes: Record<string, any>;
}

export interface CampaignWithProgress extends Campaign {
  progress_percentage: number;
  duration_minutes: number | null;
}

export interface CampaignFilters {
  channel?: 'whatsapp' | 'llamadas';
  status?: Campaign['status'];
}

export interface CampaignContactWithBatch extends CampaignContact {
  batch_number: number;
  batch_status: string;
  sent_at: string | null;
}

// Wizard types
export type ColumnMapping = Record<string, string>;

export type WizardStep = 1 | 2 | 3 | 4;

export interface ImportStats {
  total: number;
  created: number;
  updated: number;
}

export interface CampaignWizardState {
  file: File | null;
  data: any[][];
  columns: string[];
  mapping: ColumnMapping;
  stats: ImportStats | null;
  importedContactIds: string[];
  selectedChannel: 'whatsapp' | 'llamadas' | null;
  selectedWhatsAppNumberId: string | null; // Meta Phone Number ID for WhatsApp campaigns
  loading: boolean;
}
