import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare } from 'lucide-react';

interface CampaignChannelBadgeProps {
  channel: 'whatsapp' | 'llamadas';
}

export function CampaignChannelBadge({ channel }: CampaignChannelBadgeProps) {
  if (channel === 'whatsapp') {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400">
        <MessageSquare className="mr-1 h-3 w-3" />
        WhatsApp
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400">
      <Phone className="mr-1 h-3 w-3" />
      Llamadas
    </Badge>
  );
}
