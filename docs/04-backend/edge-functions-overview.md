# Edge Functions Overview

Que son las Edge Functions y cuando usarlas.

## Que son Edge Functions

Las Edge Functions de Supabase son funciones serverless que corren en Deno. Permiten ejecutar logica de servidor sin administrar infraestructura.

### Caracteristicas

- **Runtime:** Deno (TypeScript nativo)
- **Timeout:** 60 segundos (default), configurable hasta 150s
- **Memoria:** 150MB
- **Cold start:** ~200-500ms
- **Ubicacion:** Edge (globalmente distribuido)

## Cuando usar Edge Functions

### Usar Edge Functions para:

1. **Logica de negocio compleja**
   - Validaciones que requieren acceso a DB
   - Calculos que no deben exponerse al cliente

2. **Integraciones externas**
   - Llamadas a APIs de terceros (WhatsApp, Twilio)
   - OAuth flows
   - Webhooks

3. **Operaciones con secretos**
   - Encriptacion/desencriptacion
   - API keys que no deben exponerse

4. **Tareas programadas**
   - Cron jobs
   - Procesamiento de colas

5. **APIs publicas**
   - Endpoints para sistemas externos
   - Webhooks entrantes

### NO usar Edge Functions para:

1. **CRUD simple**
   - Supabase PostgREST es mas eficiente
   - Usar cliente directo con RLS

2. **Queries simples**
   - PostgREST + RLS es suficiente

3. **Operaciones muy largas**
   - Timeout de 60-150s
   - Usar background jobs

## Anatomia de una Edge Function

```typescript
// supabase/functions/example/index.ts

// Importaciones via URL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Entry point
Deno.serve(async (req: Request) => {
  // 1. Manejo de CORS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 3. Crear cliente Supabase
    const supabase = createClient(supabaseUrl, serviceKey);

    // 4. Obtener datos del request
    const { param1, param2 } = await req.json();

    // 5. Logica de negocio
    const result = await doSomething(param1, param2);

    // 6. Retornar respuesta
    return new Response(
      JSON.stringify({ data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    // 7. Manejo de errores
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
```

## CORS Headers

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
```

## Autenticacion

### Con token de usuario

```typescript
// Obtener token del header
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

// Verificar usuario
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders },
  );
}

// Obtener tenant del usuario
const { data: profile } = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('id', user.id)
  .single();
```

### Con API Key (servicios externos)

```typescript
// Verificar API key custom
const apiKey = req.headers.get('X-API-Key');

const { data: tenant } = await supabase
  .from('tenant_api_keys')
  .select('tenant_id')
  .eq('api_key', apiKey)
  .eq('is_active', true)
  .single();

if (!tenant) {
  return new Response(
    JSON.stringify({ error: 'Invalid API key' }),
    { status: 401, headers: corsHeaders },
  );
}
```

## Tipos de Funciones

### 1. Funcion Simple (una ruta)

```typescript
Deno.serve(async (req) => {
  // Una sola operacion
  const result = await doOperation(req);
  return new Response(JSON.stringify(result));
});
```

### 2. API Gateway (multiples rutas)

```typescript
import { Hono } from 'https://deno.land/x/hono/mod.ts';

const app = new Hono();

app.get('/users', async (c) => { /* ... */ });
app.post('/users', async (c) => { /* ... */ });
app.get('/users/:id', async (c) => { /* ... */ });

Deno.serve(app.fetch);
```

### 3. Webhook Handler

```typescript
Deno.serve(async (req) => {
  // Verificar firma del webhook
  const signature = req.headers.get('X-Signature');
  const body = await req.text();

  if (!verifySignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Procesar webhook
  const payload = JSON.parse(body);
  await processWebhook(payload);

  return new Response('OK', { status: 200 });
});
```

## Desarrollo Local

```bash
# Iniciar funciones localmente
supabase functions serve

# Con hot reload
supabase functions serve --watch

# Con variables de entorno
supabase functions serve --env-file .env.local

# Solo una funcion
supabase functions serve my-function
```

## Logs y Debugging

### Ver logs en dashboard

Dashboard > Edge Functions > Logs

### Console.log en funcion

```typescript
console.log('Debug:', someVariable);
console.error('Error:', error);
```

### Debugging local

```typescript
// Agregar breakpoints con Deno
debugger;
```

## Deploy

```bash
# Deploy una funcion
supabase functions deploy my-function

# Deploy todas las funciones
supabase functions deploy

# Deploy con proyecto especifico
supabase functions deploy --project-ref your-project-ref
```

## Variables de Entorno

### Configurar

Dashboard > Edge Functions > Settings > Environment Variables

### Acceder

```typescript
const apiKey = Deno.env.get('MY_API_KEY');
const url = Deno.env.get('MIDDLEWARE_URL');
```

### Variables automaticas

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Errores Comunes

### CORS error

Asegurar que `OPTIONS` retorna headers correctos.

### Timeout

- Funcion tarda mas de 60s
- Considerar dividir en partes
- Usar background jobs

### Memory error

- Procesar datos en chunks
- Evitar cargar todo en memoria

## Siguiente Paso

Continua con [API Gateway](./api-gateway.md) para ver el gateway centralizado.
