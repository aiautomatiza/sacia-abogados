import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Campaign } from '../types';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignChannelBadge } from './CampaignChannelBadge';
import { CampaignProgressBar } from './CampaignProgressBar';

interface CampaignsTableProps {
  campaigns: Campaign[];
  isLoading?: boolean;
}

export function CampaignsTable({ campaigns, isLoading }: CampaignsTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Contactos</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-32 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-28 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No se encontraron campañas</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead>Contactos</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <CampaignChannelBadge channel={campaign.channel} />
              </TableCell>
              <TableCell>
                <CampaignStatusBadge status={campaign.status} />
              </TableCell>
              <TableCell>
                <CampaignProgressBar
                  batches_sent={campaign.batches_sent}
                  total_batches={campaign.total_batches}
                  className="min-w-[200px]"
                />
              </TableCell>
              <TableCell className="font-medium">
                {campaign.total_contacts.toLocaleString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(campaign.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
