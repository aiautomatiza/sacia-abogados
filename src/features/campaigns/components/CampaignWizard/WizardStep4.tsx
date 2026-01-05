import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ChannelSelector } from '../ChannelSelector';
import { useWhatsAppNumbers } from '@/features/conversations/hooks/useWhatsAppNumbers';
import type { CampaignWizardState } from '../../types';

interface WizardStep4Props {
  state: CampaignWizardState;
  onChannelSelect: (channel: 'whatsapp' | 'llamadas') => void;
  onWhatsAppNumberSelect: (phoneNumberId: string) => void;
  onLaunch: () => void;
  onNewCampaign: () => void;
}

export function WizardStep4({
  state,
  onChannelSelect,
  onWhatsAppNumberSelect,
  onLaunch,
  onNewCampaign,
}: WizardStep4Props) {
  const { data: whatsappNumbers = [], isLoading: loadingNumbers } = useWhatsAppNumbers();
  const activeNumbers = whatsappNumbers.filter(n => n.status === 'active');

  return (
    <>
      <CardHeader>
        <CardTitle>Paso 4: Lanzar campaña</CardTitle>
        <CardDescription>
          Selecciona el canal por el que deseas enviar la campaña
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        {state.stats && (
          <div className="p-4 border rounded-lg bg-muted">
            <p className="text-sm">
              <strong>Contactos importados:</strong> {state.stats.total}
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium mb-3">Selecciona un canal:</h3>
          <ChannelSelector
            selectedChannel={state.selectedChannel}
            onSelectChannel={onChannelSelect}
          />
        </div>

        {/* WhatsApp Number Selector - only show when WhatsApp is selected */}
        {state.selectedChannel === 'whatsapp' && (
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Número de WhatsApp *</Label>
            <Select
              value={state.selectedWhatsAppNumberId || ''}
              onValueChange={onWhatsAppNumberSelect}
              disabled={loadingNumbers}
            >
              <SelectTrigger id="whatsapp-number">
                <SelectValue placeholder="Selecciona un número de WhatsApp" />
              </SelectTrigger>
              <SelectContent>
                {activeNumbers.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay números activos disponibles
                  </div>
                ) : (
                  activeNumbers.map((number) => (
                    <SelectItem key={number.phone_number_id} value={number.phone_number_id}>
                      {number.alias} ({number.phone_number})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecciona el número de WhatsApp desde el cual se enviará la campaña
            </p>
          </div>
        )}

        <div className="flex gap-2 sticky bottom-0 bg-background pt-4 pb-2 border-t mt-6">
          <Button
            onClick={onLaunch}
            disabled={
              !state.selectedChannel ||
              (state.selectedChannel === 'whatsapp' && !state.selectedWhatsAppNumberId) ||
              state.loading
            }
            className="flex-1"
          >
            {state.loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lanzar Campaña
          </Button>
          <Button variant="outline" onClick={onNewCampaign}>
            Nueva Campaña
          </Button>
        </div>
      </CardContent>
    </>
  );
}
