import { MessageCircle, Phone, Lock } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChannelSelectorProps {
  selectedChannel: 'whatsapp' | 'llamadas' | null;
  onSelectChannel: (channel: 'whatsapp' | 'llamadas') => void;
}

export function ChannelSelector({ selectedChannel, onSelectChannel }: ChannelSelectorProps) {
  const [channelsEnabled, setChannelsEnabled] = useState({
    whatsapp: true,
    calls: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannelSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (!profile?.tenant_id) {
          setLoading(false);
          return;
        }

        const { data: settings, error } = await supabase
          .from('tenant_settings')
          .select('whatsapp_enabled, calls_enabled')
          .eq('tenant_id', profile.tenant_id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching tenant settings:', error);
          toast.error('Error al cargar configuración de canales');
        } else if (settings) {
          setChannelsEnabled({
            whatsapp: settings.whatsapp_enabled,
            calls: settings.calls_enabled,
          });
        }
      } catch (error: any) {
        console.error('Error:', error);
        toast.error('Error al verificar canales disponibles');
      } finally {
        setLoading(false);
      }
    };

    fetchChannelSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        className={cn(
          'transition-all',
          !channelsEnabled.whatsapp && 'opacity-50 cursor-not-allowed',
          channelsEnabled.whatsapp && 'cursor-pointer hover:shadow-lg',
          selectedChannel === 'whatsapp' && 'ring-2 ring-primary'
        )}
        onClick={() => channelsEnabled.whatsapp && onSelectChannel('whatsapp')}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <CardTitle className="flex items-center gap-2">
              WhatsApp
              {!channelsEnabled.whatsapp && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </div>
          <CardDescription>
            {channelsEnabled.whatsapp 
              ? 'Enviar campaña por WhatsApp' 
              : 'Canal no habilitado para tu cuenta'}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card
        className={cn(
          'transition-all',
          !channelsEnabled.calls && 'opacity-50 cursor-not-allowed',
          channelsEnabled.calls && 'cursor-pointer hover:shadow-lg',
          selectedChannel === 'llamadas' && 'ring-2 ring-primary'
        )}
        onClick={() => channelsEnabled.calls && onSelectChannel('llamadas')}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <Phone className="h-8 w-8 text-blue-600" />
            <CardTitle className="flex items-center gap-2">
              Llamadas
              {!channelsEnabled.calls && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </div>
          <CardDescription>
            {channelsEnabled.calls 
              ? 'Enviar campaña por llamadas telefónicas' 
              : 'Canal no habilitado para tu cuenta'}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
