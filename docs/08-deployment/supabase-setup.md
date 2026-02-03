# Supabase Setup

Configuración completa del proyecto en Supabase.

## Crear Proyecto

1. Ir a [supabase.com](https://supabase.com)
2. Create new project
3. Configurar:
   - **Organization:** Tu organización
   - **Project name:** dashboard-consultoria
   - **Database password:** Guardar en lugar seguro
   - **Region:** Seleccionar más cercana a usuarios

4. Esperar a que el proyecto se provisione (~2 min)

## Obtener Credenciales

### Dashboard → Settings → API

Copiar y guardar:

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | Project URL | https://xxxxx.supabase.co |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/public | eyJhbGciOiJIUzI1NiIs... |
| `VITE_SUPABASE_PROJECT_ID` | Reference ID | xxxxx |

### Para Edge Functions (Secrets)

| Variable | Ubicación |
|----------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role |
| `SUPABASE_JWT_SECRET` | Settings → API → JWT Secret |

## Configurar Base de Datos

### Opción A: Ejecutar Migraciones

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link proyecto
supabase link --project-ref <PROJECT_ID>

# Push migraciones
supabase db push
```

### Opción B: Ejecutar SQL Manualmente

1. Dashboard → SQL Editor
2. Ejecutar archivos de `supabase/migrations/` en orden cronológico

### Orden de Migraciones Críticas

```
1. 20240101_initial_schema.sql      # Tablas base
2. 20240102_auth_setup.sql          # Auth y roles
3. 20240103_rls_policies.sql        # Políticas RLS
4. 20240104_functions.sql           # Funciones SQL
5. 20240105_triggers.sql            # Triggers
6. 20240106_realtime.sql            # Realtime setup
```

## Configurar Authentication

### Dashboard → Authentication → Providers

#### Email Provider
- Enable Email provider
- Disable "Confirm email" para desarrollo (habilitar en prod)

#### Custom SMTP (Producción)
Settings → Authentication → SMTP Settings:

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: SG.xxxxx
Sender Email: noreply@tudominio.com
```

### Email Templates

Dashboard → Authentication → Email Templates

Personalizar:
- Confirm signup
- Invite user
- Magic link
- Reset password

## Configurar Storage

### Dashboard → Storage

Crear buckets:

| Bucket | Public | Descripción |
|--------|--------|-------------|
| `avatars` | Yes | Fotos de perfil |
| `attachments` | No | Archivos de conversaciones |
| `call-recordings` | No | Grabaciones de llamadas |
| `imports` | No | Archivos CSV de importación |

### Políticas de Storage

```sql
-- avatars: público para lectura
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- avatars: upload por usuarios autenticados
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- attachments: solo tenant
CREATE POLICY "Tenant access to attachments"
ON storage.objects FOR ALL
USING (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);
```

## Configurar Realtime

### Dashboard → Database → Replication

Habilitar realtime para tablas:

- [x] conversations
- [x] messages
- [x] crm_contacts
- [x] crm_calls
- [x] appointments
- [x] campaigns
- [x] campaign_queue
- [x] notifications

```sql
-- Habilitar via SQL
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- etc.
```

## Configurar Edge Functions

### Deploy Functions

```bash
# Deploy todas las funciones
supabase functions deploy

# Deploy función específica
supabase functions deploy api-gateway
```

### Configurar Secrets

Dashboard → Edge Functions → Secrets

O via CLI:

```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN=xxx
supabase secrets set TWILIO_ACCOUNT_SID=xxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set ENCRYPTION_KEY=xxx
supabase secrets set PIPEDRIVE_CLIENT_ID=xxx
supabase secrets set PIPEDRIVE_CLIENT_SECRET=xxx
```

### Variables Requeridas

| Secret | Descripción |
|--------|-------------|
| `ENCRYPTION_KEY` | Key 32-byte hex para encriptar tokens |
| `WHATSAPP_ACCESS_TOKEN` | Token de WhatsApp Business |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `PIPEDRIVE_CLIENT_ID` | Pipedrive OAuth Client ID |
| `PIPEDRIVE_CLIENT_SECRET` | Pipedrive OAuth Secret |

## Configurar Webhooks

### WhatsApp

1. Meta Developer Console → Your App → WhatsApp → Configuration
2. Callback URL: `https://<PROJECT>.supabase.co/functions/v1/whatsapp-webhook`
3. Verify Token: Tu `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to: `messages`, `message_status`

### Twilio

1. Twilio Console → Phone Numbers → Your Number
2. Voice webhook: `https://<PROJECT>.supabase.co/functions/v1/twilio-webhook`
3. Status callback: `https://<PROJECT>.supabase.co/functions/v1/twilio-status`

### Pipedrive

Configurar via API al conectar integración (automático).

## Configurar Cron Jobs

Dashboard → Database → Extensions → pg_cron

```sql
-- Procesar cola de campañas cada minuto
SELECT cron.schedule(
  'process-campaign-queue',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://<PROJECT>.supabase.co/functions/v1/process-campaign-queue',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
  )$$
);

-- Limpiar invitaciones expiradas cada hora
SELECT cron.schedule(
  'clean-expired-invitations',
  '0 * * * *',
  $$SELECT clean_expired_invitations()$$
);
```

## Verificar Setup

### Checklist

- [ ] Proyecto creado
- [ ] Credenciales guardadas
- [ ] Migraciones ejecutadas
- [ ] RLS habilitado en todas las tablas
- [ ] Storage buckets creados
- [ ] Realtime habilitado
- [ ] Edge Functions deployed
- [ ] Secrets configurados
- [ ] Webhooks configurados
- [ ] Cron jobs activos

### Test Básico

```typescript
// Test conexión
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test auth
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123',
});

// Test database
const { data: tenants } = await supabase
  .from('tenants')
  .select('*')
  .limit(1);

// Test realtime
const channel = supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, console.log)
  .subscribe();
```

## Ambientes

### Desarrollo Local

```bash
# Iniciar Supabase local
supabase start

# Usar credenciales locales
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local-anon-key>
```

### Staging

Crear proyecto separado en Supabase para staging con configuración idéntica.

### Producción

- Habilitar confirmación de email
- Configurar SMTP real
- Rate limiting en Edge Functions
- Monitoreo y alertas
