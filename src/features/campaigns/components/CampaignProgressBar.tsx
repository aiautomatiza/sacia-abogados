import { Progress } from '@/components/ui/progress';

interface CampaignProgressBarProps {
  batches_sent: number;
  total_batches: number;
  className?: string;
}

export function CampaignProgressBar({ batches_sent, total_batches, className }: CampaignProgressBarProps) {
  const percentage = total_batches > 0 ? Math.round((batches_sent / total_batches) * 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">
          {batches_sent} / {total_batches} batches
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
