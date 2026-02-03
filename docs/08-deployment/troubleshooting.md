# Troubleshooting

Problemas comunes y sus soluciones.

## Frontend

### Página en blanco después de login

**Síntoma:** Usuario hace login pero ve página en blanco.

**Causas:**
1. Profile no creado en `profiles` table
2. Tenant no asignado
3. Error en useProfile hook

**Solución:**
```sql
-- Verificar profile existe
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Verificar tenant asignado
SELECT * FROM profiles WHERE id = 'user-uuid' AND tenant_id IS NOT NULL;

-- Crear profile manualmente si falta
INSERT INTO profiles (id, tenant_id, full_name, email)
VALUES ('user-uuid', 'tenant-uuid', 'Nombre', 'email@example.com');
```

### Datos no se actualizan en tiempo real

**Síntoma:** Cambios en DB no aparecen sin refresh.

**Causas:**
1. Realtime no habilitado para la tabla
2. Filter incorrecto en subscription
3. Debounce muy largo

**Solución:**
```sql
-- Verificar realtime habilitado
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Habilitar si falta
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

```typescript
// Verificar filter correcto
useRealtime({
  subscriptions: [{
    table: 'conversations',
    filter: `tenant_id=eq.${tenantId}`, // Debe coincidir con formato de Postgres
    queryKeysToInvalidate: [['conversations', tenantId]],
  }],
  enabled: !!tenantId, // Asegurar que tenantId existe
});
```

### Error 403 en queries

**Síntoma:** Error "permission denied" en queries.

**Causas:**
1. RLS blocking query
2. Policy faltante
3. tenant_id incorrecto

**Solución:**
```sql
-- Ver policies activas
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Verificar RLS habilitado
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'table_name';

-- Test query como usuario
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid"}';
SELECT * FROM table_name;
```

### Infinite loop en useQuery

**Síntoma:** Component re-renders infinitamente.

**Causa:** Query key cambia en cada render.

**Solución:**
```typescript
// ❌ Mal - objeto nuevo cada render
useQuery({
  queryKey: ['contacts', { page, filters }], // filters es nuevo objeto
});

// ✅ Bien - usar valores primitivos o memoizar
const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
useQuery({
  queryKey: ['contacts', page, filtersKey],
});
```

## Backend (Edge Functions)

### Function timeout

**Síntoma:** Error 504 Gateway Timeout.

**Causa:** Operación toma más de 60 segundos.

**Solución:**
1. Dividir en batches más pequeños
2. Usar cron job para procesos largos
3. Implementar pagination

```typescript
// Procesar en batches
const BATCH_SIZE = 50;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

### CORS error

**Síntoma:** Browser bloquea request por CORS.

**Solución:**
```typescript
// _shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// En cada function
serve(async (req) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ... tu código

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

### Secret no disponible

**Síntoma:** `Deno.env.get('SECRET')` retorna undefined.

**Solución:**
```bash
# Verificar secrets
supabase secrets list

# Agregar si falta
supabase secrets set SECRET_NAME=value
```

### Error de importación Deno

**Síntoma:** Cannot find module.

**Solución:**
```typescript
// ❌ Mal
import { something } from './file';
import pkg from 'npm-package';

// ✅ Bien
import { something } from './file.ts';
import pkg from 'npm:package-name';
```

## Base de Datos

### Migration falla

**Síntoma:** Error al ejecutar migration.

**Diagnóstico:**
```sql
-- Ver último error
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Ver locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Solución común:**
```sql
-- Si hay lock, terminar conexiones
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres' AND pid <> pg_backend_pid();
```

### RLS bloqueando inserts

**Síntoma:** Insert falla aunque el código parece correcto.

**Diagnóstico:**
```sql
-- Ver política
SELECT * FROM pg_policies WHERE tablename = 'table_name' AND cmd = 'INSERT';
```

**Solución:**
```sql
-- Policy WITH CHECK debe evaluar a true
CREATE POLICY "tenant_insert" ON table_name
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

### Función RPC no retorna datos

**Síntoma:** `supabase.rpc('function')` retorna null/vacío.

**Causas:**
1. Function no tiene RETURNS
2. SECURITY DEFINER vs SECURITY INVOKER

**Solución:**
```sql
-- Verificar función
\df+ function_name

-- Asegurar que tiene RETURNS
CREATE OR REPLACE FUNCTION my_function(p_id UUID)
RETURNS TABLE (id UUID, name TEXT) -- Especificar retorno
LANGUAGE plpgsql
SECURITY DEFINER -- Para bypasear RLS si necesario
AS $$
BEGIN
  RETURN QUERY SELECT id, name FROM table WHERE id = p_id;
END;
$$;
```

## Autenticación

### Usuario no puede hacer login

**Síntoma:** Error de credenciales incorrectas.

**Diagnóstico:**
```sql
-- Verificar usuario existe
SELECT id, email, email_confirmed_at, banned_until
FROM auth.users
WHERE email = 'user@example.com';
```

**Soluciones:**
```sql
-- Si email no confirmado (desarrollo)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';

-- Si usuario baneado
UPDATE auth.users
SET banned_until = NULL
WHERE email = 'user@example.com';
```

### Token expirado constantemente

**Síntoma:** Usuario deslogueado frecuentemente.

**Causa:** Refresh token no se renueva.

**Solución en frontend:**
```typescript
// Verificar autoRefreshToken está habilitado
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

## Integraciones

### OAuth callback falla

**Síntoma:** Error después de autorizar en provider.

**Diagnóstico:**
1. Verificar redirect URI coincide exactamente
2. Verificar state token no expiró
3. Ver logs de Edge Function

```bash
supabase functions logs oauth-callback --tail
```

**Soluciones comunes:**
- Verificar `REDIRECT_URI` en env y provider config
- Aumentar tiempo de expiración de CSRF token
- Verificar client secret correcto

### WhatsApp webhook no recibe mensajes

**Diagnóstico:**
```bash
# Ver logs
supabase functions logs whatsapp-webhook --tail
```

**Verificar en Meta:**
1. App → WhatsApp → Configuration
2. Callback URL correcta
3. Verify Token correcto
4. Subscriptions activas (messages, message_status)

**Test manual:**
```bash
curl -X GET "https://<project>.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

### Twilio webhook no procesa llamadas

**Verificar:**
1. URL en Twilio Console correcta
2. Signature validation correcta

```typescript
// Temporalmente deshabilitar validación para debug
// SOLO EN DESARROLLO
const skipValidation = Deno.env.get('SKIP_TWILIO_VALIDATION') === 'true';
if (!skipValidation && !verifyTwilioSignature(...)) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Performance

### Queries lentas

**Diagnóstico:**
```sql
-- Ver queries lentas
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Soluciones:**
```sql
-- Agregar índices faltantes
CREATE INDEX idx_contacts_tenant ON crm_contacts(tenant_id);
CREATE INDEX idx_contacts_search ON crm_contacts(tenant_id, nombre, numero);

-- Para búsquedas de texto
CREATE INDEX idx_contacts_nombre_trgm ON crm_contacts USING gin(nombre gin_trgm_ops);
```

### Bundle muy grande

**Diagnóstico:**
```bash
npm run build -- --report
```

**Soluciones:**
1. Lazy loading de rutas
2. Tree shaking de imports
3. Analizar dependencias grandes

```typescript
// Lazy loading
const ContactsPage = lazy(() => import('./pages/Contacts'));

// Import específico
import { Button } from '@/components/ui/button'; // ✅
import * as UI from '@/components/ui'; // ❌
```

## Logs y Monitoreo

### Ver todos los logs

```bash
# Frontend (browser console)
# Backend (Supabase CLI)
supabase functions logs --tail

# Database
# Dashboard → Database → Logs
```

### Habilitar logging verbose

```typescript
// Frontend
localStorage.setItem('debug', 'supabase:*');

// Recargar página para ver logs detallados
```
