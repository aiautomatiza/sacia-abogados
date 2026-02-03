# Edge Functions Deploy

Guía para desplegar y mantener Edge Functions de Supabase.

## Prerequisitos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Verificar instalación
supabase --version
```

## Setup Inicial

```bash
# Login a Supabase
supabase login

# Link proyecto (desde raíz del proyecto)
supabase link --project-ref <PROJECT_ID>
```

## Estructura de Functions

```
supabase/functions/
├── _shared/               # Código compartido
│   ├── auth.ts           # Verificación JWT/API Key
│   ├── cors.ts           # Headers CORS
│   ├── crypto.ts         # Encriptación de tokens
│   ├── phone.ts          # Normalización teléfonos
│   └── secrets.ts        # Acceso a secrets
│
├── api-gateway/          # API Gateway centralizado
│   └── index.ts
├── create-contact/
│   └── index.ts
├── send-campaign/
│   └── index.ts
└── ... (19 functions más)
```

## Deploy

### Deploy Todas las Functions

```bash
supabase functions deploy
```

### Deploy Function Específica

```bash
supabase functions deploy api-gateway
supabase functions deploy send-campaign
```

### Deploy con Verificación

```bash
# Deploy y verificar logs
supabase functions deploy api-gateway && supabase functions logs api-gateway --tail
```

## Configurar Secrets

### Ver Secrets Actuales

```bash
supabase secrets list
```

### Agregar/Actualizar Secret

```bash
# Individual
supabase secrets set MY_SECRET=value

# Múltiples
supabase secrets set \
  WHATSAPP_ACCESS_TOKEN=xxx \
  TWILIO_ACCOUNT_SID=xxx \
  ENCRYPTION_KEY=xxx
```

### Desde Archivo .env

```bash
# Crear archivo con secrets
cat > .env.production << EOF
WHATSAPP_ACCESS_TOKEN=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
ENCRYPTION_KEY=xxx
EOF

# Cargar todos
supabase secrets set --env-file .env.production
```

### Secrets Requeridos

| Secret | Descripción | Usado por |
|--------|-------------|-----------|
| `ENCRYPTION_KEY` | 32-byte hex key | oauth-callback, sync-crm |
| `WHATSAPP_ACCESS_TOKEN` | Meta API token | send-whatsapp, whatsapp-webhook |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID | send-whatsapp |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Verify token | whatsapp-webhook |
| `TWILIO_ACCOUNT_SID` | Twilio SID | twilio-* functions |
| `TWILIO_AUTH_TOKEN` | Twilio token | twilio-* functions |
| `PIPEDRIVE_CLIENT_ID` | OAuth client ID | initiate-oauth |
| `PIPEDRIVE_CLIENT_SECRET` | OAuth secret | oauth-callback |
| `ZOHO_CLIENT_ID` | OAuth client ID | initiate-oauth |
| `ZOHO_CLIENT_SECRET` | OAuth secret | oauth-callback |

## Desarrollo Local

### Iniciar Functions Localmente

```bash
# Iniciar Supabase local (incluye functions)
supabase start

# O solo functions
supabase functions serve
```

### Serve Function Específica

```bash
supabase functions serve api-gateway --env-file .env.local
```

### Test Local

```bash
# Test con curl
curl -X POST http://localhost:54321/functions/v1/api-gateway/contacts \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

## Logs y Debugging

### Ver Logs en Tiempo Real

```bash
supabase functions logs --tail
```

### Logs de Function Específica

```bash
supabase functions logs api-gateway --tail
```

### Logs Históricos

```bash
# Últimas 100 líneas
supabase functions logs api-gateway --limit 100
```

### Dashboard

Dashboard → Edge Functions → Seleccionar function → Logs

## Manejo de Errores

### Estructura de Error Estándar

```typescript
// _shared/errors.ts
export function errorResponse(message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Uso
if (!data.phone) {
  return errorResponse('Phone number required', 400);
}
```

### Logging

```typescript
// Usar console para logs
console.log('Processing request', { tenant_id, user_id });
console.error('Failed to send message', error);

// Los logs aparecen en supabase functions logs
```

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy-functions.yml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy functions
        run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Secrets en GitHub

Configurar en Repository → Settings → Secrets:

- `SUPABASE_ACCESS_TOKEN` - Token de `supabase login`
- `SUPABASE_PROJECT_ID` - Project reference ID

## Actualizaciones

### Actualizar Dependencias

```typescript
// Actualizar versiones en imports
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
```

### Rollback

```bash
# Ver deploys anteriores
supabase functions list

# No hay rollback nativo, redeploy versión anterior desde git
git checkout <commit> -- supabase/functions/api-gateway
supabase functions deploy api-gateway
```

## Troubleshooting

### Function No Responde

1. Verificar logs: `supabase functions logs <name> --tail`
2. Verificar secrets configurados
3. Test localmente: `supabase functions serve <name>`

### Error de Importación

```typescript
// ❌ Incorrecto
import { something } from './file';

// ✅ Correcto (incluir extensión)
import { something } from './file.ts';
```

### CORS Error

```typescript
// Asegurar headers CORS en respuesta
import { corsHeaders } from '../_shared/cors.ts';

return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### Timeout

- Límite: 60 segundos por request
- Dividir operaciones largas en batches
- Usar cron jobs para procesos largos

### Memory Limit

- Límite: ~150MB por invocación
- Procesar datos en streaming
- Evitar cargar archivos grandes en memoria

## Best Practices

1. **Código compartido en `_shared/`**
2. **Validar inputs al inicio**
3. **Usar early returns para errores**
4. **Logging estructurado**
5. **Manejar errores con try/catch**
6. **Secrets nunca en código**
7. **CORS headers en todas las respuestas**
8. **Timeouts explícitos en fetch calls**
