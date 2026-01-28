import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Package, TrendingUp, Clock, Wifi, WifiOff } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { KPICard } from '@/components/ui/kpi-card';
import {
  useCampaign,
  useCampaignContacts,
  useRealtimeCampaignDetail,
  CampaignStatusBadge,
  CampaignChannelBadge,
  CampaignContactsTable,
} from '@/features/campaigns';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading: loadingCampaign } = useCampaign(id!);
  const { data: contacts, isLoading: loadingContacts } = useCampaignContacts(id!);

  // Realtime updates - subscribe to campaign and batch changes
  const { isConnected } = useRealtimeCampaignDetail({
    campaignId: id,
    debounceMs: 500, // Faster updates for detail view
  });

  if (loadingCampaign) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="h-32 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <p className="text-muted-foreground">Campaña no encontrada</p>
      </div>
    );
  }

  const progressPercentage = campaign.total_batches > 0
    ? Math.round((campaign.batches_sent / campaign.total_batches) * 100)
    : 0;

  const breadcrumbs = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => navigate('/campaigns')} className="cursor-pointer">
            Campañas
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Detalle</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  const badges = (
    <div className="flex items-center gap-2">
      <CampaignChannelBadge channel={campaign.channel} />
      <CampaignStatusBadge status={campaign.status} />
      {/* Realtime connection indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
        {isConnected ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-green-500" />
            <span>En vivo</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            <span>Conectando...</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <PageHeader
        title={`Campaña de ${campaign.channel === 'whatsapp' ? 'WhatsApp' : 'Llamadas'}`}
        description={`ID: ${campaign.id}`}
        breadcrumbs={breadcrumbs}
        badges={badges}
        actions={
          <Button variant="outline" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label="Total Contactos"
          value={campaign.total_contacts.toLocaleString()}
          variant="primary"
        />
        <KPICard
          icon={<Package className="h-5 w-5" />}
          label="Batches Enviados"
          value={`${campaign.batches_sent} / ${campaign.total_batches}`}
          variant="info"
        />
        <KPICard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Progreso"
          value={`${progressPercentage}%`}
          progress={progressPercentage}
          variant="success"
        />
        <KPICard
          icon={<Clock className="h-5 w-5" />}
          label="Estado"
          value={campaign.status === 'completed' ? 'Completada' : 'En Progreso'}
          variant={campaign.status === 'completed' ? 'success' : 'warning'}
        />
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Contactos de la Campaña</h2>
        <CampaignContactsTable contacts={contacts || []} isLoading={loadingContacts} />
      </div>
    </div>
  );
}
