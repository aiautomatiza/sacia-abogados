import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWhatsAppNumberMutations } from '@/features/conversations/hooks/useWhatsAppNumberMutations';
import type { WhatsAppNumber } from '@/features/conversations/services/whatsapp-number.service';

interface WhatsAppNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingNumber?: WhatsAppNumber | null;
  tenantId: string;
}

export function WhatsAppNumberDialog({
  open,
  onOpenChange,
  onSuccess,
  editingNumber,
  tenantId,
}: WhatsAppNumberDialogProps) {
  const { createMutation, updateMutation } = useWhatsAppNumberMutations(tenantId);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [alias, setAlias] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [whatsappCredential, setWhatsappCredential] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const isEditing = !!editingNumber;
  const loading = createMutation.isPending || updateMutation.isPending;

  // Load editing data
  useEffect(() => {
    if (editingNumber) {
      setPhoneNumber(editingNumber.phone_number);
      setPhoneNumberId(editingNumber.phone_number_id);
      setWabaId(editingNumber.waba_id || '');
      setAlias(editingNumber.alias);
      setIsDefault(editingNumber.is_default);
      setWhatsappCredential(editingNumber.whatsapp_credential || '');
      setWebhookUrl(editingNumber.webhook_url || '');
    } else {
      // Reset form when creating new
      setPhoneNumber('');
      setPhoneNumberId('');
      setWabaId('');
      setAlias('');
      setIsDefault(false);
      setWhatsappCredential('');
      setWebhookUrl('');
    }
  }, [editingNumber, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingNumber.id,
          data: {
            phone_number: phoneNumber,
            phone_number_id: phoneNumberId,
            waba_id: wabaId || null,
            alias,
            is_default: isDefault,
            whatsapp_credential: whatsappCredential || undefined,
            webhook_url: webhookUrl || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          phone_number: phoneNumber,
          phone_number_id: phoneNumberId,
          waba_id: wabaId || null,
          alias,
          is_default: isDefault,
          whatsapp_credential: whatsappCredential || undefined,
          webhook_url: webhookUrl || undefined,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error already handled by mutation hooks
      console.error('Error saving WhatsApp number:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Número de WhatsApp' : 'Agregar Número de WhatsApp'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la configuración del número de WhatsApp'
              : 'Configura un nuevo número de WhatsApp para tu tenant'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">
                Número de Teléfono *
              </Label>
              <Input
                id="phone_number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+34644613012"
                required
                pattern="^\+[1-9]\d{1,14}$"
                title="Formato E.164 requerido (ej: +34644613012)"
              />
              <p className="text-xs text-muted-foreground">
                Formato E.164: + seguido de código de país y número (ej: +34644613012)
              </p>
            </div>

            {/* Phone Number ID (Meta) */}
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">
                Phone Number ID (Meta) *
              </Label>
              <Input
                id="phone_number_id"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="1234567890123456"
                required
                pattern="^\d{10,20}$|^PENDING_[a-f0-9]{8}$"
                title="ID numérico de Meta (10-20 dígitos) o placeholder PENDING_xxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                ID del número en WhatsApp Business API de Meta (15-16 dígitos numéricos)
              </p>
              {phoneNumberId.startsWith('PENDING_') && (
                <p className="text-xs text-yellow-600 font-medium">
                  ⚠️ Este es un ID temporal. Actualízalo con el ID real de Meta cuando esté disponible.
                </p>
              )}
            </div>

            {/* WABA ID */}
            <div className="space-y-2">
              <Label htmlFor="waba_id">
                WhatsApp Business Account ID (WABA) *
              </Label>
              <Input
                id="waba_id"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="102290129340398"
                required
                pattern="^\d{15,17}$|^WABA_PENDING_[a-f0-9]{8}$"
                title="WABA ID numérico de Meta (15-17 dígitos) o placeholder"
              />
              <p className="text-xs text-muted-foreground">
                ID de la cuenta de WhatsApp Business en Meta Business Manager (15-17 dígitos)
              </p>
              <p className="text-xs text-blue-600 font-medium">
                💡 El WABA ID determina qué plantillas estarán disponibles para este número
              </p>
              {wabaId.startsWith('WABA_PENDING_') && (
                <p className="text-xs text-yellow-600 font-medium">
                  ⚠️ Este es un ID temporal. Actualízalo con el WABA ID real de Meta.
                </p>
              )}
            </div>

            {/* Alias */}
            <div className="space-y-2">
              <Label htmlFor="alias">Alias / Nombre *</Label>
              <Input
                id="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: Soporte, Ventas, Principal"
                required
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Nombre descriptivo para identificar este número en la UI
              </p>
            </div>

            {/* Is Default */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <label
                htmlFor="is_default"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Número predeterminado
              </label>
              <p className="text-xs text-muted-foreground ml-2">
                (usado por defecto al crear nuevas conversaciones)
              </p>
            </div>

            {/* WhatsApp Credential */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp_credential">
                Credencial de WhatsApp (Opcional)
              </Label>
              <Input
                id="whatsapp_credential"
                type="password"
                value={whatsappCredential}
                onChange={(e) => setWhatsappCredential(e.target.value)}
                placeholder="API Token o Credential"
              />
              <p className="text-xs text-muted-foreground">
                Token de autenticación para WhatsApp Business API
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhook_url">
                Webhook URL (Opcional)
              </Label>
              <Input
                id="webhook_url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhook/whatsapp"
              />
              <p className="text-xs text-muted-foreground">
                URL para recibir webhooks de este número específico
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
