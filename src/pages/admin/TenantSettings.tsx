import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as adminService from '@/features/admin/services/admin.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TenantSettings {
  whatsapp_enabled: boolean;
  calls_enabled: boolean;
  conversations_enabled: boolean;
  appointments_enabled: boolean;
  whatsapp_webhook_url: string;
  calls_webhook_url: string;
  conversations_webhook_url: string;
  appointments_webhook_url: string;
  calls_phone_number: string;
}

interface TenantCredentials {
  whatsapp: string;
  calls: string;
  conversations: string;
}

export default function TenantSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TenantSettings>({
    whatsapp_enabled: false,
    calls_enabled: false,
    conversations_enabled: false,
    appointments_enabled: false,
    whatsapp_webhook_url: '',
    calls_webhook_url: '',
    conversations_webhook_url: '',
    appointments_webhook_url: '',
    calls_phone_number: '',
  });
  const [credentials, setCredentials] = useState<TenantCredentials>({
    whatsapp: '',
    calls: '',
    conversations: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await adminService.getTenantSettings(id!);
        if (data) {
          // Convert null values to empty strings/false for controlled inputs
          setSettings({
            whatsapp_enabled: data.whatsapp_enabled ?? false,
            calls_enabled: data.calls_enabled ?? false,
            conversations_enabled: data.conversations_enabled ?? false,
            appointments_enabled: data.appointments_enabled ?? false,
            whatsapp_webhook_url: data.whatsapp_webhook_url ?? '',
            calls_webhook_url: data.calls_webhook_url ?? '',
            conversations_webhook_url: data.conversations_webhook_url ?? '',
            appointments_webhook_url: data.appointments_webhook_url ?? '',
            calls_phone_number: data.calls_phone_number ?? '',
          });
        }
      } catch (error: any) {
        toast.error('Error al cargar configuración: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSettings();
    }
  }, [id]);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isValidPhoneNumber = (phone: string) => {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Client-side validations
      if (settings.whatsapp_enabled && !settings.whatsapp_webhook_url) {
        toast.error('WhatsApp webhook URL es obligatorio cuando el canal está habilitado');
        return;
      }

      if (settings.whatsapp_webhook_url && !isValidUrl(settings.whatsapp_webhook_url)) {
        toast.error('WhatsApp webhook URL debe ser HTTPS válido');
        return;
      }

      if (settings.calls_enabled && !settings.calls_webhook_url) {
        toast.error('Webhook URL de llamadas es obligatorio cuando el canal está habilitado');
        return;
      }

      if (settings.calls_webhook_url && !isValidUrl(settings.calls_webhook_url)) {
        toast.error('Webhook URL de llamadas debe ser HTTPS válido');
        return;
      }

      if (settings.calls_enabled && !settings.calls_phone_number) {
        toast.error('Número de teléfono es obligatorio cuando las llamadas están habilitadas');
        return;
      }

      if (settings.calls_phone_number && !isValidPhoneNumber(settings.calls_phone_number)) {
        toast.error('Número de teléfono inválido (formato: +34612345678)');
        return;
      }

      // Conversaciones validations
      if (settings.conversations_enabled && !settings.conversations_webhook_url) {
        toast.error('Webhook URL de conversaciones es obligatorio cuando el canal está habilitado');
        return;
      }

      if (settings.conversations_webhook_url && !isValidUrl(settings.conversations_webhook_url)) {
        toast.error('Webhook URL de conversaciones debe ser HTTPS válido');
        return;
      }

      // Build update payload
      const updatePayload: any = { ...settings };

      // Only send credentials if they were updated (not empty)
      if (credentials.whatsapp || credentials.calls || credentials.conversations) {
        updatePayload.credentials = {};
        if (credentials.whatsapp) updatePayload.credentials.whatsapp = credentials.whatsapp;
        if (credentials.calls) updatePayload.credentials.calls = credentials.calls;
        if (credentials.conversations) updatePayload.credentials.conversations = credentials.conversations;
      }

      await adminService.updateTenantSettings(id!, updatePayload);

      toast.success('Configuración guardada correctamente');

      // Clear credentials inputs after save
      setCredentials({ whatsapp: '', calls: '', conversations: '' });
    } catch (error: any) {
      toast.error('Error al guardar configuración: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Configuración del Cliente</h1>
        <p className="text-muted-foreground mt-1">
          Configura los canales y webhooks para este cliente
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="grid gap-6 max-w-2xl pr-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Configuración del canal de WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp-enabled">Habilitar WhatsApp</Label>
                <Switch
                  id="whatsapp-enabled"
                  checked={settings.whatsapp_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, whatsapp_enabled: checked })
                  }
                />
              </div>
              
              {settings.whatsapp_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-webhook">Webhook URL *</Label>
                    <Input
                      id="whatsapp-webhook"
                      type="url"
                      placeholder="https://..."
                      value={settings.whatsapp_webhook_url}
                      onChange={(e) =>
                        setSettings({ ...settings, whatsapp_webhook_url: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Debe ser HTTPS. Este webhook recibirá los contactos y credenciales.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-credential">API Key / Token de WhatsApp</Label>
                    <Input
                      id="whatsapp-credential"
                      type="password"
                      placeholder="Dejar vacío para mantener actual"
                      value={credentials.whatsapp}
                      onChange={(e) =>
                        setCredentials({ ...credentials, whatsapp: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta credencial se enviará de forma segura al webhook en cada campaña.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Llamadas</CardTitle>
              <CardDescription>Configuración del canal de llamadas telefónicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="calls-enabled">Habilitar Llamadas</Label>
                <Switch
                  id="calls-enabled"
                  checked={settings.calls_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, calls_enabled: checked })
                  }
                />
              </div>
              
              {settings.calls_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="calls-webhook">Webhook URL *</Label>
                    <Input
                      id="calls-webhook"
                      type="url"
                      placeholder="https://..."
                      value={settings.calls_webhook_url}
                      onChange={(e) =>
                        setSettings({ ...settings, calls_webhook_url: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Debe ser HTTPS. Este webhook recibirá los contactos, credenciales y número de teléfono.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="calls-phone">Número de Teléfono *</Label>
                    <Input
                      id="calls-phone"
                      type="tel"
                      placeholder="+34612345678"
                      value={settings.calls_phone_number}
                      onChange={(e) =>
                        setSettings({ ...settings, calls_phone_number: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato E.164: +[código país][número]. Ej: +34612345678
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calls-credential">API Key / Token para Llamadas</Label>
                    <Input
                      id="calls-credential"
                      type="password"
                      placeholder="Dejar vacío para mantener actual"
                      value={credentials.calls}
                      onChange={(e) =>
                        setCredentials({ ...credentials, calls: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta credencial se enviará de forma segura al webhook en cada campaña.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Conversaciones Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Conversaciones</CardTitle>
              <CardDescription>
                Configuración del canal de conversaciones (WhatsApp, Instagram, webchat, email, voice)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="conversations-enabled">Habilitar Conversaciones</Label>
                <Switch
                  id="conversations-enabled"
                  checked={settings.conversations_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, conversations_enabled: checked })
                  }
                />
              </div>

              {settings.conversations_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="conversations-webhook">Webhook URL *</Label>
                    <Input
                      id="conversations-webhook"
                      type="url"
                      placeholder="https://..."
                      value={settings.conversations_webhook_url}
                      onChange={(e) =>
                        setSettings({ ...settings, conversations_webhook_url: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Debe ser HTTPS. Este webhook recibirá los mensajes de conversaciones.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conversations-credential">API Key / Token de Conversaciones</Label>
                    <Input
                      id="conversations-credential"
                      type="password"
                      placeholder="Dejar vacío para mantener actual"
                      value={credentials.conversations}
                      onChange={(e) =>
                        setCredentials({ ...credentials, conversations: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta credencial se enviará de forma segura al webhook en el header Authorization.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Citas Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Citas</CardTitle>
              <CardDescription>
                Configuración del módulo de citas (llamadas y presenciales)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="appointments-enabled">Habilitar Citas</Label>
                <Switch
                  id="appointments-enabled"
                  checked={settings.appointments_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, appointments_enabled: checked })
                  }
                />
              </div>

              {settings.appointments_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="appointments-webhook">Webhook URL (opcional)</Label>
                  <Input
                    id="appointments-webhook"
                    type="url"
                    placeholder="https://..."
                    value={settings.appointments_webhook_url}
                    onChange={(e) =>
                      setSettings({ ...settings, appointments_webhook_url: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Si se configura, se enviará una notificación a este webhook cuando se creen, modifiquen o cancelen citas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campañas Configuration - Derived from WhatsApp/Calls */}
          <Card>
            <CardHeader>
              <CardTitle>Campañas</CardTitle>
              <CardDescription>
                Módulo de campañas (WhatsApp y llamadas masivas)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Estado del módulo</Label>
                <span className={`text-sm font-medium ${settings.whatsapp_enabled || settings.calls_enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {settings.whatsapp_enabled || settings.calls_enabled ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Las campañas se habilitan automáticamente cuando WhatsApp o Llamadas están activos.
              </p>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
