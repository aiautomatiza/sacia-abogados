# Backend - Edge Functions

Documentacion de las Supabase Edge Functions.

## Contenido

1. [Edge Functions Overview](./edge-functions-overview.md) - Que son y cuando usarlas
2. [API Gateway](./api-gateway.md) - Gateway centralizado con Hono
3. [Authentication Middleware](./authentication-middleware.md) - Auth en funciones
4. [Functions Reference](./functions-reference.md) - Listado de todas las funciones
5. [Shared Utilities](./shared-utilities.md) - Codigo compartido

## Funciones Detalladas

| Funcion | Documento |
|---------|-----------|
| `api-gateway` | [api-gateway.md](./functions/api-gateway.md) |
| `create-contact` | [create-contact.md](./functions/create-contact.md) |
| `send-campaign` | [send-campaign.md](./functions/send-campaign.md) |
| `external-appointments-api` | [external-appointments-api.md](./functions/external-appointments-api.md) |

## Quick Reference

### Estructura de una Edge Function

```
supabase/functions/
├── _shared/                    # Codigo compartido
│   ├── auth.ts                 # Verificacion de auth
│   ├── crypto.ts               # Encriptacion
│   ├── phone.ts                # Normalizacion telefonos
│   └── secrets.ts              # Manejo de secretos
└── function-name/
    └── index.ts                # Entry point
```

### Runtime

- **Runtime:** Deno
- **TypeScript:** Nativo
- **Imports:** Via URL (deno.land, esm.sh, npm:)

### Crear Nueva Funcion

```bash
# Crear carpeta y archivo
mkdir -p supabase/functions/my-function
touch supabase/functions/my-function/index.ts
```

### Estructura Basica

```typescript
// supabase/functions/my-function/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Crear cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Tu logica aqui...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
```

### Deploy

```bash
# Deploy una funcion
supabase functions deploy my-function

# Deploy todas
supabase functions deploy

# Con variables de entorno
supabase functions deploy my-function --env-file .env.local
```

### Invocar desde Frontend

```typescript
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { param1: 'value1' },
});
```

## Variables de Entorno

| Variable | Descripcion | Disponible |
|----------|-------------|------------|
| `SUPABASE_URL` | URL del proyecto | Automatica |
| `SUPABASE_SERVICE_ROLE_KEY` | Key con permisos admin | Automatica |
| `SUPABASE_ANON_KEY` | Key publica | Automatica |
| `MIDDLEWARE_URL` | URL del middleware externo | Manual |
| `DASHBOARD_URL` | URL del frontend | Manual |
| `ENCRYPTION_KEY` | Clave de encriptacion | Manual |
| `ENCRYPTION_IV` | IV para AES | Manual |

Configurar en: **Dashboard > Edge Functions > Settings**

## Listado de Funciones

### Autenticacion y Usuarios

| Funcion | Descripcion |
|---------|-------------|
| `invite-user` | Enviar invitacion por email |
| `complete-invitation` | Completar registro |

### Contactos

| Funcion | Descripcion |
|---------|-------------|
| `create-contact` | Crear contacto desde API externa |
| `import-contacts` | Importar contactos masivo |
| `sync-contact-from-external` | Sincronizar contacto individual |
| `external-contact-api` | API publica de contactos |

### Mensajeria

| Funcion | Descripcion |
|---------|-------------|
| `send-conversation-message` | Enviar mensaje |
| `send-template-message` | Enviar template WhatsApp |
| `process-whatsapp-attachment` | Procesar adjuntos |

### Campanas

| Funcion | Descripcion |
|---------|-------------|
| `send-campaign` | Crear y encolar campana |
| `process-campaign-queue` | Procesar cola (cron) |

### Citas

| Funcion | Descripcion |
|---------|-------------|
| `external-appointments-api` | API publica de citas |

### Integraciones OAuth

| Funcion | Descripcion |
|---------|-------------|
| `initiate-oauth` | Iniciar flujo OAuth |
| `handle-oauth-callback` | Procesar callback |
| `sync-contacts` | Sincronizar contactos |

### Administracion

| Funcion | Descripcion |
|---------|-------------|
| `manage-tenants` | CRUD de tenants |
| `manage-tenant-settings` | Configuracion de tenant |
| `api-gateway` | Gateway REST centralizado |
| `migrate-credentials` | Migrar credenciales |

## Siguiente Paso

Continua con [Edge Functions Overview](./edge-functions-overview.md) para entender cuando usar cada tipo.
