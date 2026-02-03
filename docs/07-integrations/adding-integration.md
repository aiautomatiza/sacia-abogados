# Adding a New Integration

Guía para agregar una nueva integración externa.

## Checklist

- [ ] Configurar credenciales OAuth (si aplica)
- [ ] Crear Edge Functions necesarias
- [ ] Agregar provider a tabla `integrations`
- [ ] Crear componentes de UI
- [ ] Documentar la integración

## Paso 1: Definir Provider

Agregar constantes del nuevo provider:

```typescript
// supabase/functions/_shared/providers.ts
export const PROVIDERS = {
  pipedrive: {
    name: 'Pipedrive',
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    apiBaseUrl: 'https://api.pipedrive.com/v1',
    scopes: ['contacts:read', 'contacts:write'],
  },
  zoho: {
    name: 'Zoho CRM',
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    apiBaseUrl: 'https://www.zohoapis.com/crm/v3',
    scopes: ['ZohoCRM.modules.contacts.READ'],
  },
  // Tu nuevo provider
  hubspot: {
    name: 'HubSpot',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    apiBaseUrl: 'https://api.hubapi.com',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
  },
};
```

## Paso 2: Variables de Entorno

Agregar credenciales en Supabase:

```bash
# En Supabase Dashboard > Edge Functions > Secrets
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
```

Actualizar `_shared/secrets.ts`:

```typescript
export const secrets = {
  // ...existing
  hubspot: {
    clientId: Deno.env.get('HUBSPOT_CLIENT_ID'),
    clientSecret: Deno.env.get('HUBSPOT_CLIENT_SECRET'),
  },
};
```

## Paso 3: OAuth Flow

Si usa OAuth, actualizar `initiate-oauth` y `oauth-callback`:

```typescript
// initiate-oauth/index.ts - agregar case
case 'hubspot':
  authUrl = new URL(PROVIDERS.hubspot.authUrl);
  authUrl.searchParams.set('client_id', secrets.hubspot.clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', PROVIDERS.hubspot.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  break;
```

```typescript
// oauth-callback/index.ts - agregar exchange logic
async function exchangeCodeForTokens(code: string, provider: string) {
  const config = PROVIDERS[provider];
  const secrets = getSecrets(provider);

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
    }),
  });

  return response.json();
}
```

## Paso 4: Crear Edge Function de Sync

```typescript
// supabase/functions/sync-hubspot/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken, encryptToken } from '../_shared/oauth.ts';
import { PROVIDERS } from '../_shared/providers.ts';

serve(async (req) => {
  const supabase = createClient(/* ... */);
  const { integration_id, sync_type } = await req.json();

  // 1. Get integration
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integration_id)
    .single();

  // 2. Get valid token
  const accessToken = await getValidAccessToken(integration);

  // 3. Fetch contacts from HubSpot
  const contacts = await fetchHubSpotContacts(accessToken, sync_type);

  // 4. Map and upsert
  for (const contact of contacts) {
    await upsertContact(integration.tenant_id, mapHubSpotContact(contact));
  }

  return jsonResponse({ success: true, synced: contacts.length });
});

async function fetchHubSpotContacts(token: string, syncType: string) {
  const url = new URL(`${PROVIDERS.hubspot.apiBaseUrl}/crm/v3/objects/contacts`);
  url.searchParams.set('limit', '100');
  url.searchParams.set('properties', 'firstname,lastname,email,phone');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  return data.results;
}

function mapHubSpotContact(hubspotContact: any) {
  return {
    nombre: `${hubspotContact.properties.firstname} ${hubspotContact.properties.lastname}`.trim(),
    email: hubspotContact.properties.email,
    numero: hubspotContact.properties.phone,
    external_id: `hubspot_${hubspotContact.id}`,
    external_source: 'hubspot',
  };
}
```

## Paso 5: Webhook (Opcional)

Si el provider soporta webhooks:

```typescript
// supabase/functions/hubspot-webhook/index.ts
serve(async (req) => {
  // 1. Verify webhook signature
  const signature = req.headers.get('x-hubspot-signature-v3');
  if (!verifyHubSpotSignature(signature, await req.text())) {
    return new Response('Unauthorized', { status: 401 });
  }

  const events = await req.json();

  for (const event of events) {
    switch (event.subscriptionType) {
      case 'contact.creation':
      case 'contact.propertyChange':
        await handleContactChange(event);
        break;
      case 'contact.deletion':
        await handleContactDeletion(event);
        break;
    }
  }

  return new Response('OK');
});
```

## Paso 6: Componentes de UI

### Card de Integración

```typescript
// src/features/integrations/components/HubSpotCard.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntegration } from '../hooks/useIntegrations';

export function HubSpotCard() {
  const { data: integration, isLoading } = useIntegration('hubspot');

  const handleConnect = () => {
    window.location.href = `${SUPABASE_URL}/functions/v1/initiate-oauth?provider=hubspot&tenant_id=${tenantId}`;
  };

  const handleDisconnect = async () => {
    await supabase
      .from('integrations')
      .update({ is_active: false })
      .eq('id', integration.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HubSpotIcon />
          HubSpot
        </CardTitle>
      </CardHeader>
      <CardContent>
        {integration?.is_active ? (
          <div className="space-y-4">
            <Badge variant="success">Conectado</Badge>
            <HubSpotSync integrationId={integration.id} />
            <Button variant="outline" onClick={handleDisconnect}>
              Desconectar
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect}>
            Conectar HubSpot
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Componente de Sync

```typescript
// src/features/integrations/components/HubSpotSync.tsx
export function HubSpotSync({ integrationId }: { integrationId: string }) {
  const [syncing, setSyncing] = useState(false);
  const { data: lastSync } = useLastSyncLog(integrationId);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-hubspot', {
        body: { integration_id: integrationId, sync_type: 'incremental' },
      });
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleSync} disabled={syncing}>
        {syncing ? 'Sincronizando...' : 'Sincronizar'}
      </Button>
      {lastSync && (
        <p className="text-sm text-muted-foreground">
          Última sync: {formatDate(lastSync.completed_at)} -
          {lastSync.records_synced} contactos
        </p>
      )}
    </div>
  );
}
```

## Paso 7: Agregar a IntegrationsList

```typescript
// src/features/integrations/components/IntegrationsList.tsx
import { HubSpotCard } from './HubSpotCard';

export function IntegrationsList() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <PipedriveCard />
      <ZohoCard />
      <HubSpotCard /> {/* Nueva integración */}
    </div>
  );
}
```

## Paso 8: Documentar

Crear `docs/07-integrations/hubspot.md`:

```markdown
# HubSpot Integration

## Configuración
...

## Sincronización
...

## Campos Mapeados
| HubSpot | Dashboard |
|---------|-----------|
| firstname + lastname | nombre |
| email | email |
| phone | numero |

## Errores Comunes
...
```

## Testing

### Local

```bash
# Simular OAuth callback
curl -X GET "http://localhost:54321/functions/v1/oauth-callback?code=test&state=test-state"

# Test sync
curl -X POST "http://localhost:54321/functions/v1/sync-hubspot" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"integration_id": "uuid", "sync_type": "full"}'
```

### Producción

1. Conectar cuenta de prueba
2. Verificar tokens guardados (encriptados)
3. Ejecutar sync manual
4. Verificar contactos importados
5. Test webhook (si aplica)

## Checklist Final

- [ ] Provider definido en `_shared/providers.ts`
- [ ] Secrets configurados en Supabase
- [ ] OAuth flow funciona
- [ ] Edge Function de sync creada
- [ ] Webhook configurado (si aplica)
- [ ] UI components creados
- [ ] Documentación escrita
- [ ] Tests pasando
