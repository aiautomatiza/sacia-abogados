# Integrations Feature - OAuth Flow

## Arquitectura del sistema

Este módulo implementa un sistema completo de integraciones OAuth con software de gestión externo (Zoho, Salesforce, HubSpot, etc.).

### Componentes principales

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO OAUTH COMPLETO                        │
└─────────────────────────────────────────────────────────────────────┘

1. Usuario hace clic en "Conectar" → IntegrationCard
2. Frontend llama → initiate-oauth (Supabase Function)
3. initiate-oauth llama → MIDDLEWARE /api/oauth/authorize
4. Middleware genera URL de OAuth → Provider externo (Zoho, etc.)
5. Usuario autoriza en el provider
6. Provider redirige → MIDDLEWARE /api/oauth/callback
7. Middleware obtiene tokens → Llama handle-oauth-callback (Supabase)
8. handle-oauth-callback guarda → integration_credentials (DB)
9. Middleware redirige → /oauth/callback (Frontend)
10. OAuthCallback procesa → Muestra resultado
11. Redirige a → /admin/integrations
12. Realtime updates → Actualiza UI automáticamente
```

---

## 📁 Estructura de archivos

```
src/features/integrations/
├── components/
│   ├── IntegrationCard.tsx          # Card con botón conectar/desconectar
│   ├── IntegrationStatusBadge.tsx   # Badge de estado (activa/error/etc)
│   ├── SyncButton.tsx               # Botón para sincronizar contactos
│   ├── SyncHistoryTable.tsx         # Tabla de historial de sincronización
│   └── FieldMappingEditor.tsx       # Editor de mapeo de campos
│
├── hooks/
│   ├── useIntegrations.ts           # Query de integraciones
│   ├── useIntegrationMutations.ts   # Mutations (connect/disconnect)
│   ├── useOAuthCallback.ts          # ✨ Hook para procesar callback OAuth
│   ├── useSyncMutations.ts          # Mutations de sincronización
│   └── useSyncLogs.ts               # Query de logs de sync
│
├── services/
│   ├── integration.service.ts       # CRUD de integraciones
│   ├── oauth-callback.service.ts    # ✨ Procesamiento de callback OAuth
│   └── sync.service.ts              # Servicios de sincronización
│
├── types/
│   └── index.ts                     # TypeScript types
│
├── utils/
│   └── field-mapping.ts             # Utilidades de mapeo de campos
│
└── README.md                        # Este archivo
```

---

## 🔄 Flujo OAuth detallado

### 1. Inicio de OAuth (Frontend)

**Componente:** `IntegrationCard.tsx`
**Hook:** `useIntegrationMutations.connectIntegration`

```typescript
// Usuario hace clic en "Conectar"
connectIntegration.mutate('zoho');

// Llama a integration.service.ts
await initiateOAuth('zoho');

// Invoca Supabase Function
supabase.functions.invoke('initiate-oauth', {
  body: {
    integration_name: 'zoho',
    tenant_id: scope.tenantId,
  },
});
```

### 2. Supabase Function: initiate-oauth

**Ubicación:** `supabase/functions/initiate-oauth/index.ts`

```typescript
// Valida autenticación y tenant
// Llama al middleware
fetch(`${MIDDLEWARE_URL}/api/oauth/authorize`, {
  body: {
    integration_name: 'zoho',
    tenant_id: tenant_id,
    redirect_url: `${DASHBOARD_URL}/oauth/callback`, // ✨ Nueva ruta
  },
});

// Retorna authorization_url
return { authorization_url, state };
```

### 3. Middleware procesa OAuth

El middleware (servidor Hono externo) hace:

1. Genera `state` firmado con HMAC (CSRF protection)
2. Crea URL de autorización del provider (Zoho/Salesforce/etc.)
3. Redirige al usuario al provider

### 4. Usuario autoriza en el provider

El usuario ve la pantalla de autorización del provider externo y acepta.

### 5. Provider redirige al middleware

```
GET /api/oauth/callback?code=xxx&state=yyy
```

El middleware:
1. Verifica el `state` (CSRF protection)
2. Intercambia `code` por `access_token` y `refresh_token`
3. Encripta los tokens (AES-256-CTR)
4. Llama a `handle-oauth-callback` de Supabase

### 6. Supabase Function: handle-oauth-callback

**Ubicación:** `supabase/functions/handle-oauth-callback/index.ts`

```typescript
// Guarda credenciales en la base de datos
await supabase
  .from('integration_credentials')
  .upsert({
    tenant_id,
    integration_name: 'zoho',
    status: 'active',
    provider_user_id,
    provider_account_name,
    scopes,
  });

// Crea configuración de sincronización por defecto
await supabase
  .from('integration_sync_settings')
  .insert({
    integration_id: credential.id,
    enabled: true,
    sync_frequency: 'manual',
  });
```

### 7. Middleware redirige al frontend

```
Redirect → https://dashboard.com/oauth/callback?state=yyy
```

### 8. Página OAuthCallback procesa el resultado

**Ubicación:** `src/pages/OAuthCallback.tsx`
**Hook:** `useOAuthCallback`
**Servicio:** `oauth-callback.service.ts`

```typescript
// 1. Extrae parámetros de la URL
const params = extractOAuthParams();
// { state: 'xxx', error: null }

// 2. Procesa el callback
const result = await processOAuthCallback(params);

// 3. Verifica que la integración existe en la DB
// 4. Muestra toast de éxito/error
// 5. Limpia parámetros de la URL
// 6. Redirige a /admin/integrations
```

### 9. Realtime updates actualizan la UI

**Ubicación:** `src/pages/Integrations.tsx`

```typescript
useRealtime({
  subscriptions: [
    {
      table: 'integration_credentials',
      event: '*',
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['integrations', tenantId]],
    },
  ],
});
```

Cuando `handle-oauth-callback` guarda la integración:
- Postgres dispara un evento INSERT
- Realtime subscription lo detecta
- Query de `useIntegrations` se invalida automáticamente
- UI se actualiza mostrando la integración conectada

---

## 🎯 Características clave

### ✨ Manejo automático del callback

El hook `useOAuthCallback` procesa automáticamente los parámetros OAuth:

```typescript
// Uso básico - procesa automáticamente
const { isProcessing } = useOAuthCallback();

// Con callbacks personalizados
const { hasOAuthParams, result } = useOAuthCallback({
  redirectTo: '/admin/integrations',
  autoProcess: true,
  onSuccess: (result) => {
    console.log('Connected:', result.integration);
  },
  onError: (error) => {
    console.error('Failed:', error);
  },
});
```

### 🔄 Realtime updates

Las integraciones y logs de sincronización se actualizan en tiempo real:

- **No polling**: Usa Postgres realtime subscriptions
- **Debouncing**: Evita re-renders excesivos (1000ms)
- **Filtrado por tenant**: Solo recibe cambios de su organización

### 🔒 Seguridad multi-tenant

Todas las operaciones verifican `tenant_id`:

1. **Frontend**: `getCurrentUserScope()` obtiene tenant del perfil
2. **Supabase Functions**: Verifican que `tenant_id` del body coincida con el perfil del usuario
3. **Database**: RLS policies filtran por tenant
4. **Realtime**: Suscripciones filtradas por tenant

### 📊 Sincronización de contactos

Una vez conectada la integración, puedes sincronizar:

```typescript
// Desde IntegrationCard → SyncButton
sync.mutate({
  integrationId: 'xxx',
  filters: { search: 'empresa' },
});

// Llama a supabase/functions/sync-contacts
// 1. Obtiene contactos de crm_contacts
// 2. Aplica field_mappings (mapeo de campos)
// 3. Envía al middleware → provider externo
// 4. Registra en sync_logs
// 5. Actualiza last_sync_at
```

---

## 🛠️ Configuración requerida

### Variables de entorno - Frontend

`.env`:
```bash
VITE_MIDDLEWARE_URL=https://your-middleware.railway.app
```

### Variables de entorno - Supabase

Configurar en Supabase Dashboard → Edge Functions → Settings:

```bash
MIDDLEWARE_URL=https://your-middleware.railway.app
DASHBOARD_URL=https://your-dashboard.com
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

### Migraciones de base de datos

Aplicar: `supabase/migrations/20260103_add_integration_tables.sql`

Crea:
- `integration_credentials`
- `integration_sync_settings`
- `sync_logs`

### Desplegar Supabase Functions

```bash
supabase functions deploy initiate-oauth
supabase functions deploy handle-oauth-callback
supabase functions deploy sync-contacts
```

---

## 📝 Rutas

| Ruta | Propósito | Acceso |
|------|-----------|--------|
| `/admin/integrations` | Página principal de integraciones | SuperAdmin |
| `/oauth/callback` | Procesa callback OAuth | Authenticated |

---

## 🧪 Testing del flujo

### 1. Iniciar OAuth
```bash
# Usuario hace clic en "Conectar" en Zoho
# Debería abrir nueva ventana/tab del provider
```

### 2. Autorizar en provider
```bash
# Usuario ve pantalla de Zoho
# Acepta permisos
```

### 3. Callback
```bash
# Usuario es redirigido a /oauth/callback
# Ve pantalla de "Procesando conexión..."
# Luego "¡Integración conectada!"
# Redirige a /admin/integrations
```

### 4. Verificar en UI
```bash
# Card de Zoho muestra badge "Activa"
# Aparece botón "Sincronizar ahora"
# Aparece botón "Desconectar"
```

---

## 🐛 Troubleshooting

### Error: "MIDDLEWARE_URL environment variable is not configured"

**Causa:** Variable no configurada en Supabase Functions

**Solución:**
1. Ir a Supabase Dashboard
2. Edge Functions → Settings
3. Agregar `MIDDLEWARE_URL`

### Error: "Integration not found" después del callback

**Causa:** `handle-oauth-callback` no se ejecutó o falló

**Solución:**
1. Revisar logs de Supabase Functions
2. Verificar que el middleware llama correctamente a `handle-oauth-callback`
3. Revisar RLS policies de `integration_credentials`

### La UI no se actualiza después de conectar

**Causa:** Realtime updates no funcionando

**Solución:**
1. Verificar que Realtime esté habilitado en Supabase
2. Revisar console del navegador por errores de suscripción
3. Verificar filtro de tenant_id en la suscripción

### El callback redirige a /integrations en vez de /oauth/callback

**Causa:** `DASHBOARD_URL` o `redirect_url` mal configurado

**Solución:**
1. Verificar `DASHBOARD_URL` en Supabase Functions
2. Asegurar que `initiate-oauth` pasa `/oauth/callback`
3. Verificar que el middleware usa el `redirect_url` correcto

---

## 🚀 Mejoras futuras

### 1. Tokens expirados
- [ ] Detectar tokens expirados
- [ ] Refresh automático de tokens
- [ ] Notificar al usuario para reconectar

### 2. Sincronización automática
- [ ] Scheduled functions para sync periódico
- [ ] Usar campo `sync_frequency` ('hourly', 'daily')
- [ ] Cron jobs en Supabase

### 3. Validación de scopes
- [ ] Validar que scopes otorgados sean los requeridos
- [ ] Mostrar advertencia si faltan permisos

### 4. Field mapping UI
- [ ] Página de configuración de integración
- [ ] Usar `FieldMappingEditor` component
- [ ] Preview de mapeo antes de sincronizar

### 5. Sync filters
- [ ] Usar campo `sync_filters` de DB
- [ ] UI para configurar filtros
- [ ] Sincronizar solo contactos que cumplan filtros

---

## 📚 Referencias

- [MIDDLEWARE_API.md](../../../MIDDLEWARE_API.md) - Documentación del middleware
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - Realtime subscriptions
- [OAuth 2.0](https://oauth.net/2/) - Protocolo OAuth
