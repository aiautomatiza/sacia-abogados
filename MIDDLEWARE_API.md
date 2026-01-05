# Middleware API Documentation

## Tabla de Contenidos

- [Visión General](#visión-general)
- [Configuración](#configuración)
- [Authentication Middleware](#authentication-middleware)
- [Rate Limiting Middleware](#rate-limiting-middleware)
- [Cryptographic Utilities](#cryptographic-utilities)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Visión General

Este servicio de integración utiliza middlewares de Hono para proporcionar autenticación, rate limiting y protección de endpoints. Los middlewares están diseñados para trabajar en conjunto con Supabase Auth y Redis.

### Tecnologías

- **Framework**: Hono
- **Autenticación**: Supabase JWT (jose)
- **Rate Limiting**: Redis con algoritmo sliding window
- **Encriptación**: AES-256-CTR con HMAC-SHA256

---

## Configuración

### Variables de Entorno Requeridas

```bash
# Autenticación
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Encriptación (debe ser exactamente 32 bytes en UTF-8)
ENCRYPTION_KEY=your_32_byte_encryption_key_here

# Redis (para rate limiting)
REDIS_URL=redis://localhost:6379
```

### Validaciones de Configuración

- `SUPABASE_JWT_SECRET`: Requerido al iniciar el servidor
- `ENCRYPTION_KEY`: Debe ser exactamente 32 bytes cuando se codifica en UTF-8
- Redis debe estar disponible para el rate limiting

---

## Authentication Middleware

### `verifySupabaseAuth`

Middleware que verifica tokens JWT de Supabase y extrae información del usuario para multi-tenancy.

#### Ubicación
`src/api/middlewares/auth.middleware.ts:28`

#### Características

- Verifica tokens JWT de Supabase usando el algoritmo HS256
- Extrae `userId`, `tenantId` y `userEmail` del token
- Inyecta las variables en el contexto de Hono para uso posterior
- Soporta multi-tenancy mediante `organization_id`

#### Variables de Contexto Inyectadas

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `userId` | `string` | ID del usuario (claim `sub` del JWT) |
| `tenantId` | `string` | ID de la organización o userId como fallback |
| `userEmail` | `string \| undefined` | Email del usuario si está disponible |

#### Extracción del tenantId

El `tenantId` se determina con la siguiente prioridad:

1. `user_metadata.organization_id` (si existe en el JWT)
2. `sub` (userId) como fallback

#### Request Headers

```http
Authorization: Bearer <supabase_jwt_token>
```

#### Respuestas

**Success**: Continúa al siguiente middleware/handler con contexto inyectado

**Error 401 - Missing Authorization**
```json
{
  "error": "Missing or invalid authorization header"
}
```

**Error 403 - Invalid Token**
```json
{
  "error": "Invalid or expired token"
}
```

#### Estructura del JWT

```typescript
interface SupabaseJWTPayload {
  sub: string;              // User ID
  email?: string;           // Email del usuario
  user_metadata?: {
    organization_id?: string;  // ID de la organización
    [key: string]: any;
  };
  role?: string;            // Rol del usuario
  [key: string]: any;
}
```

#### Ejemplo de Uso

```typescript
import { Hono } from 'hono';
import { verifySupabaseAuth } from './middlewares/auth.middleware';

const app = new Hono();

// Aplicar a todas las rutas
app.use('/*', verifySupabaseAuth);

// Usar las variables inyectadas
app.get('/protected', (c) => {
  const userId = c.get('userId');
  const tenantId = c.get('tenantId');
  const userEmail = c.get('userEmail');

  return c.json({ userId, tenantId, userEmail });
});
```

#### Seguridad

- Los tokens se verifican usando la clave secreta de Supabase
- Algoritmo: HS256 (HMAC con SHA-256)
- Los errores de verificación se registran en consola
- No se expone información sensible en las respuestas de error

---

## Rate Limiting Middleware

### `rateLimit(options)`

Factory function que crea un middleware de rate limiting usando Redis con algoritmo sliding window.

#### Ubicación
`src/api/middlewares/rate-limit.middleware.ts:15`

#### Características

- Implementa sliding window counter usando Redis Sorted Sets
- Identificación por userId (si está autenticado) o IP
- Headers informativos de rate limit en cada respuesta
- Fail-open: permite requests si Redis falla
- Opción para excluir requests exitosos del contador

#### Parámetros

```typescript
interface RateLimitOptions {
  windowMs: number;              // Ventana de tiempo en milisegundos
  maxRequests: number;           // Máximo de requests en la ventana
  keyPrefix?: string;            // Prefijo para keys de Redis (default: 'ratelimit')
  skipSuccessfulRequests?: boolean;  // No contar requests exitosos (default: false)
}
```

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `windowMs` | `number` | Sí | - | Duración de la ventana en milisegundos |
| `maxRequests` | `number` | Sí | - | Número máximo de requests permitidos |
| `keyPrefix` | `string` | No | `'ratelimit'` | Prefijo para keys en Redis |
| `skipSuccessfulRequests` | `boolean` | No | `false` | Si true, no cuenta requests con status < 400 |

#### Response Headers

Cada respuesta incluye headers informativos:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-01-02T12:34:56.789Z
```

Cuando se excede el límite:
```http
Retry-After: 60
```

#### Respuestas

**Success**: Continúa al siguiente handler

**Error 429 - Rate Limit Exceeded**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

#### Identificación del Cliente

El middleware identifica clientes en el siguiente orden:

1. `userId` del contexto (si está autenticado)
2. Header `x-forwarded-for`
3. Header `x-real-ip`
4. Fallback: `'unknown'`

#### Algoritmo Sliding Window

```
1. Remover requests fuera de la ventana actual
2. Contar requests en la ventana
3. Añadir el request actual con timestamp
4. Establecer expiración de la key
5. Verificar si excede el límite
```

#### Middlewares Preconfigurados

##### `strictRateLimit`
Para endpoints sensibles (OAuth, autenticación)

```typescript
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  maxRequests: 10,            // 10 requests/min
  keyPrefix: 'ratelimit:strict',
});
```

**Ubicación**: `src/api/middlewares/rate-limit.middleware.ts:96`

##### `moderateRateLimit`
Para endpoints de sincronización

```typescript
export const moderateRateLimit = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  maxRequests: 30,            // 30 requests/min
  keyPrefix: 'ratelimit:moderate',
});
```

**Ubicación**: `src/api/middlewares/rate-limit.middleware.ts:106`

##### `generalRateLimit`
Para endpoints generales

```typescript
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  maxRequests: 100,           // 100 requests/min
  keyPrefix: 'ratelimit:general',
});
```

**Ubicación**: `src/api/middlewares/rate-limit.middleware.ts:116`

#### Ejemplo de Uso

```typescript
import { Hono } from 'hono';
import { strictRateLimit, generalRateLimit } from './middlewares/rate-limit.middleware';

const app = new Hono();

// Rate limit estricto para OAuth
app.post('/oauth/authorize', strictRateLimit, (c) => {
  // Handler
});

// Rate limit general para API
app.get('/api/*', generalRateLimit, (c) => {
  // Handler
});

// Rate limit personalizado
import { rateLimit } from './middlewares/rate-limit.middleware';

const customLimit = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutos
  maxRequests: 50,
  skipSuccessfulRequests: true,
});

app.post('/api/heavy-operation', customLimit, (c) => {
  // Handler
});
```

#### Consideraciones de Rendimiento

- **Fail-open**: Si Redis falla, los requests se permiten (se registra el error)
- **Limpieza automática**: Keys expiran automáticamente en Redis
- **Operaciones atómicas**: Usa Redis MULTI/EXEC para transacciones
- **Sliding window**: Más preciso que fixed window, menos memory-intensive que token bucket

#### Logs

```
[RateLimit] Limit exceeded for <identifier>: 101/100
[RateLimit] Error checking rate limit: <error>
```

---

## Cryptographic Utilities

### Funciones de Encriptación

#### `encrypt(text: string): string`

Encripta texto usando AES-256-CTR con versionado.

**Ubicación**: `src/lib/crypto.ts:26`

**Parámetros**:
- `text`: Texto plano a encriptar

**Retorna**: String en formato `"version:iv:encryptedContent"` (hex)

**Formato de Salida**:
```
v1:3f7e8a9b2c1d4e5f6a7b8c9d0e1f2a3b:8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f...
```

**Ejemplo**:
```typescript
import { encrypt } from './lib/crypto';

const encrypted = encrypt('sensitive_data');
// => "v1:3f7e8a9b...:8c9d0e1f..."
```

#### `decrypt(hash: string): string`

Desencripta texto encriptado con la función `encrypt`.

**Ubicación**: `src/lib/crypto.ts:39`

**Parámetros**:
- `hash`: String encriptado

**Retorna**: Texto plano original

**Formato Soportados**:
- Legacy: `"iv:encryptedContent"`
- Actual: `"version:iv:encryptedContent"`

**Ejemplo**:
```typescript
import { decrypt } from './lib/crypto';

const decrypted = decrypt('v1:3f7e8a9b...:8c9d0e1f...');
// => "sensitive_data"
```

**Errores**:
```typescript
throw new Error('Invalid encrypted format');
throw new Error('Unsupported encryption version: v2');
```

### Funciones de OAuth State

#### `signOAuthState(value: string, expiresInMinutes?: number): string`

Firma un valor para protección CSRF en flujos OAuth.

**Ubicación**: `src/lib/crypto.ts:88`

**Parámetros**:
- `value`: Valor a firmar (ej. tenantId)
- `expiresInMinutes`: Minutos hasta expiración (default: 10)

**Retorna**: String firmado en formato `"value.timestamp.signature"` (base64url)

**Formato de Salida**:
```
tenant_123.1704214800000.x7j9kL3mN8pQ2rS5tU9vW1xY4zA6bC8dE0fG2hI4jK6
```

**Ejemplo**:
```typescript
import { signOAuthState } from './lib/crypto';

const state = signOAuthState('tenant_123', 15);
// => "tenant_123.1704214800000.x7j9kL3m..."
```

#### `verifyOAuthState(signedState: string): string`

Verifica y extrae un valor firmado del OAuth state.

**Ubicación**: `src/lib/crypto.ts:105`

**Parámetros**:
- `signedState`: String firmado

**Retorna**: El valor original si es válido

**Ejemplo**:
```typescript
import { verifyOAuthState } from './lib/crypto';

try {
  const tenantId = verifyOAuthState(state);
  // => "tenant_123"
} catch (error) {
  // Manejo de error
}
```

**Errores**:
```typescript
throw new Error('Invalid state format');
throw new Error('Invalid state timestamp');
throw new Error('State has expired');
throw new Error('Invalid state signature');
```

#### Seguridad de OAuth State

- **HMAC-SHA256**: Firma criptográfica para prevenir modificación
- **Timing-safe comparison**: Usa `timingSafeEqual` para prevenir timing attacks
- **Expiración**: Tokens de state expiran automáticamente
- **Base64URL**: Formato seguro para URLs

---

## Ejemplos de Uso

### Ejemplo 1: API Protegida con Auth y Rate Limiting

```typescript
import { Hono } from 'hono';
import { verifySupabaseAuth } from './middlewares/auth.middleware';
import { moderateRateLimit } from './middlewares/rate-limit.middleware';

const app = new Hono();

// Stack de middlewares
app.use('/api/*', verifySupabaseAuth, moderateRateLimit);

app.get('/api/data', (c) => {
  const tenantId = c.get('tenantId');

  // Consultar datos del tenant
  return c.json({ tenantId, data: [] });
});
```

### Ejemplo 2: Flujo OAuth con State Firmado

```typescript
import { Hono } from 'hono';
import { signOAuthState, verifyOAuthState } from './lib/crypto';
import { strictRateLimit } from './middlewares/rate-limit.middleware';

const app = new Hono();

// Iniciar OAuth
app.get('/oauth/authorize', strictRateLimit, (c) => {
  const tenantId = c.get('tenantId');

  // Firmar el state para CSRF protection
  const state = signOAuthState(tenantId, 10);

  const authUrl = `https://oauth-provider.com/authorize?state=${state}`;
  return c.redirect(authUrl);
});

// Callback OAuth
app.get('/oauth/callback', strictRateLimit, async (c) => {
  const state = c.req.query('state');

  try {
    // Verificar y extraer tenantId
    const tenantId = verifyOAuthState(state);

    // Procesar callback
    return c.json({ success: true, tenantId });
  } catch (error) {
    return c.json({ error: 'Invalid or expired state' }, 400);
  }
});
```

### Ejemplo 3: Almacenamiento de Tokens Encriptados

```typescript
import { encrypt, decrypt } from './lib/crypto';
import { prisma } from './lib/db';

async function saveToken(tenantId: string, accessToken: string) {
  const encrypted = encrypt(accessToken);

  await prisma.integration.create({
    data: {
      tenantId,
      encryptedAccessToken: encrypted,
    },
  });
}

async function getToken(tenantId: string): Promise<string> {
  const integration = await prisma.integration.findFirst({
    where: { tenantId },
  });

  if (!integration) {
    throw new Error('Integration not found');
  }

  return decrypt(integration.encryptedAccessToken);
}
```

### Ejemplo 4: Rate Limiting Personalizado por Tenant

```typescript
import { createMiddleware } from 'hono/factory';
import { rateLimit } from './middlewares/rate-limit.middleware';

// Rate limit específico para un endpoint costoso
const heavyOperationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  maxRequests: 5,             // Solo 5 requests cada 15 min
  keyPrefix: 'ratelimit:heavy',
  skipSuccessfulRequests: false,
});

app.post('/api/sync-all', verifySupabaseAuth, heavyOperationLimit, async (c) => {
  const tenantId = c.get('tenantId');

  // Operación costosa
  await performHeavySync(tenantId);

  return c.json({ status: 'completed' });
});
```

### Ejemplo 5: Combinación de Todos los Middlewares

```typescript
import { Hono } from 'hono';
import { verifySupabaseAuth } from './middlewares/auth.middleware';
import { strictRateLimit, generalRateLimit } from './middlewares/rate-limit.middleware';
import { signOAuthState, verifyOAuthState, encrypt, decrypt } from './lib/crypto';

const app = new Hono();

// Rutas públicas sin protección
app.get('/health', (c) => c.json({ status: 'ok' }));

// Rutas OAuth con rate limiting estricto
const oauthRoutes = new Hono();
oauthRoutes.use('/*', strictRateLimit);
oauthRoutes.get('/authorize', (c) => {
  const state = signOAuthState(c.get('tenantId'));
  return c.redirect(`https://provider.com/auth?state=${state}`);
});
oauthRoutes.get('/callback', async (c) => {
  const state = c.req.query('state');
  const tenantId = verifyOAuthState(state);
  // Procesar callback...
  return c.json({ success: true });
});

// API protegida con auth y rate limiting general
const apiRoutes = new Hono();
apiRoutes.use('/*', verifySupabaseAuth, generalRateLimit);
apiRoutes.get('/data', async (c) => {
  const tenantId = c.get('tenantId');
  // Retornar datos...
  return c.json({ data: [] });
});

// Montar rutas
app.route('/oauth', oauthRoutes);
app.route('/api', apiRoutes);

export default app;
```

---

## Consideraciones de Seguridad

### Autenticación
- Los tokens JWT se validan en cada request
- No se almacenan tokens en el servidor
- Los secretos se cargan desde variables de entorno
- Errores genéricos para prevenir information leakage

### Rate Limiting
- Previene ataques de fuerza bruta
- Protege contra DDoS a nivel de aplicación
- Fail-open para alta disponibilidad
- Logs de límites excedidos para monitoreo

### Encriptación
- AES-256-CTR para datos en reposo
- HMAC-SHA256 para integridad de OAuth state
- Versionado para futuras migraciones
- Timing-safe comparisons para prevenir timing attacks
- Keys de 32 bytes (256 bits) requeridas

### Headers de Seguridad
```typescript
// Configuración recomendada
app.use('/*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
});
```

---

## Troubleshooting

### Error: "SUPABASE_JWT_SECRET is not defined"
**Causa**: Variable de entorno no configurada
**Solución**: Añadir `SUPABASE_JWT_SECRET` al archivo `.env`

### Error: "ENCRYPTION_KEY must be exactly 32 bytes"
**Causa**: La clave no tiene 32 bytes cuando se codifica en UTF-8
**Solución**: Usar solo caracteres ASCII (a-z, A-Z, 0-9) de longitud 32

### Error: "Redis transaction failed"
**Causa**: Redis no está disponible o conexión perdida
**Solución**: Verificar que Redis esté corriendo y `REDIS_URL` sea correcta
**Nota**: El middleware permite requests si Redis falla (fail-open)

### 429 Too Many Requests
**Causa**: Rate limit excedido
**Solución**: Esperar el tiempo indicado en `Retry-After` header
**Prevención**: Implementar exponential backoff en el cliente

### 403 Invalid or expired token
**Causa**: Token JWT inválido, expirado o secreto incorrecto
**Solución**:
- Verificar que `SUPABASE_JWT_SECRET` coincida con Supabase
- Refrescar el token en el cliente
- Verificar la fecha de expiración del token

---

## Referencias

- [Hono Middleware Documentation](https://hono.dev/docs/guides/middleware)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Redis Rate Limiting](https://redis.io/docs/manual/patterns/rate-limiter/)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
