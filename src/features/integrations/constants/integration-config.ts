export interface IntegrationConfig {
  name: string;
  displayName: string;
  type: string;
  logo: string;
  description: string;
  color: string;
}

export const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  pipedrive: {
    name: 'pipedrive',
    displayName: 'Pipedrive',
    type: 'crm',
    logo: 'https://cdn.worldvectorlogo.com/logos/pipedrive.svg',
    description: 'Gestión de ventas y pipeline',
    color: '#000000',
  },
  hubspot: {
    name: 'hubspot',
    displayName: 'HubSpot',
    type: 'crm',
    logo: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    description: 'CRM y automatización de marketing',
    color: '#FF7A59',
  },
  salesforce: {
    name: 'salesforce',
    displayName: 'Salesforce',
    type: 'crm',
    logo: 'https://cdn.worldvectorlogo.com/logos/salesforce-2.svg',
    description: 'CRM empresarial',
    color: '#00A1E0',
  },
  zoho: {
    name: 'zoho',
    displayName: 'Zoho CRM',
    type: 'crm',
    logo: 'https://www.zoho.com/branding/images/zcrm-logo.svg',
    description: 'CRM para pequeñas y medianas empresas',
    color: '#E42527',
  },
};

export function getIntegrationConfig(integrationName: string): IntegrationConfig | undefined {
  return INTEGRATION_CONFIGS[integrationName.toLowerCase()];
}
