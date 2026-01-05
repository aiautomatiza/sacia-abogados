export interface Integration {
  id: string;
  tenant_id: string;
  integration_name: string;
  integration_type: string;
  status: 'pending' | 'active' | 'expired' | 'error';
  provider_user_id: string | null;
  provider_account_name: string | null;
  scopes: string[] | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  integration_sync_settings?: IntegrationSyncSettings[];
}

export interface IntegrationSyncSettings {
  id: string;
  integration_id: string;
  enabled: boolean;
  sync_frequency: 'manual' | 'hourly' | 'daily';
  field_mappings: Record<string, string>;
  sync_filters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  tenant_id: string;
  integration_id: string | null;
  operation: 'export_contacts' | 'export_conversations';
  direction: 'outbound';
  status: 'pending' | 'processing' | 'success' | 'failed';
  total_records: number;
  processed_records: number;
  failed_records: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  triggered_by: string | null;
  trigger_type: 'manual' | 'scheduled' | 'automatic';
  integration_credentials?: {
    integration_name: string;
  };
}

export interface SyncContactsParams {
  integrationId: string;
  filters?: {
    search?: string;
  };
}

export interface UpdateSyncSettingsParams {
  enabled?: boolean;
  sync_frequency?: 'manual' | 'hourly' | 'daily';
  field_mappings?: Record<string, string>;
}
