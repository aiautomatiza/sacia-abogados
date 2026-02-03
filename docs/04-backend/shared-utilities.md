# Shared Utilities

Codigo compartido entre Edge Functions en `_shared/`.

## Estructura

```
supabase/functions/_shared/
├── auth.ts         # Verificacion de autenticacion
├── crypto.ts       # Encriptacion y desencriptacion
├── phone.ts        # Normalizacion de telefonos
└── secrets.ts      # Manejo de secretos
```

## auth.ts

Utilidades para verificar autenticacion y obtener datos del usuario.

### verifyAuth

Verifica el token JWT y retorna el usuario.

```typescript
import { verifyAuth } from '../_shared/auth.ts';

export async function verifyAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<User> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

// Uso
const user = await verifyAuth(req, supabase);
```

### getTenantFromUser

Obtiene el tenant_id del perfil del usuario.

```typescript
export async function getTenantFromUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.tenant_id) {
    throw new Error('User has no tenant assigned');
  }

  return profile.tenant_id;
}

// Uso
const tenantId = await getTenantFromUser(supabase, user.id);
```

### isSuperAdmin

Verifica si el usuario es super_admin.

```typescript
export async function isSuperAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .single();

  return !!data;
}

// Uso
if (!(await isSuperAdmin(supabase, user.id))) {
  throw new Error('Super admin required');
}
```

### verifyApiKey

Verifica API key de tenant para APIs externas.

```typescript
export async function verifyApiKey(
  req: Request,
  supabase: SupabaseClient
): Promise<{ tenantId: string }> {
  const tenantId = req.headers.get('x-tenant-id');
  const apiKey = req.headers.get('x-api-key');

  if (!tenantId || !apiKey) {
    throw new Error('Missing x-tenant-id or x-api-key headers');
  }

  // Verificar credenciales
  const { data: creds } = await supabase
    .from('tenant_credentials')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (!creds) {
    throw new Error('Invalid tenant');
  }

  // Desencriptar y verificar
  const storedKey = await decrypt(creds.calls_credential);
  if (storedKey !== apiKey) {
    throw new Error('Invalid API key');
  }

  return { tenantId };
}
```

## crypto.ts

Utilidades de encriptacion AES-256.

### encrypt

Encripta texto usando AES-256-CTR.

```typescript
export async function encrypt(text: string): Promise<string> {
  const key = Deno.env.get('ENCRYPTION_KEY');
  const iv = Deno.env.get('ENCRYPTION_IV');

  if (!key || !iv) {
    throw new Error('Encryption keys not configured');
  }

  const keyBytes = hexToBytes(key);
  const ivBytes = hexToBytes(iv);
  const textBytes = new TextEncoder().encode(text);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['encrypt'],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: ivBytes, length: 64 },
    cryptoKey,
    textBytes,
  );

  return bytesToHex(new Uint8Array(encrypted));
}

// Uso
const encrypted = await encrypt('my-secret-api-key');
```

### decrypt

Desencripta texto AES-256-CTR.

```typescript
export async function decrypt(encryptedHex: string): Promise<string> {
  const key = Deno.env.get('ENCRYPTION_KEY');
  const iv = Deno.env.get('ENCRYPTION_IV');

  if (!key || !iv) {
    throw new Error('Encryption keys not configured');
  }

  const keyBytes = hexToBytes(key);
  const ivBytes = hexToBytes(iv);
  const encryptedBytes = hexToBytes(encryptedHex);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['decrypt'],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: ivBytes, length: 64 },
    cryptoKey,
    encryptedBytes,
  );

  return new TextDecoder().decode(decrypted);
}

// Uso
const apiKey = await decrypt(creds.calls_credential);
```

### Funciones Helper

```typescript
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

## phone.ts

Normalizacion de numeros de telefono.

### normalizePhoneNumber

Normaliza telefono a formato E.164.

```typescript
export function normalizePhoneNumber(
  phone: string,
  defaultCountryCode: string = '52'
): string {
  // Eliminar espacios, guiones, parentesis
  let normalized = phone.replace(/[\s\-\(\)\.]/g, '');

  // Eliminar prefijo de WhatsApp
  if (normalized.endsWith('@c.us')) {
    normalized = normalized.replace('@c.us', '');
  }

  // Si empieza con +, quitar
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }

  // Si empieza con 00, quitar
  if (normalized.startsWith('00')) {
    normalized = normalized.substring(2);
  }

  // Si no tiene codigo de pais, agregar default
  if (normalized.length === 10) {
    normalized = defaultCountryCode + normalized;
  }

  // Validar que solo tenga digitos
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid phone number: ${phone}`);
  }

  return normalized;
}

// Uso
const phone = normalizePhoneNumber('+52 (55) 1234-5678');
// Resultado: '5255123456789'
```

### formatPhoneForDisplay

Formatea telefono para mostrar al usuario.

```typescript
export function formatPhoneForDisplay(phone: string): string {
  // Mexico: +52 55 1234 5678
  if (phone.startsWith('52') && phone.length === 12) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 8)} ${phone.slice(8)}`;
  }

  // US: +1 555 123 4567
  if (phone.startsWith('1') && phone.length === 11) {
    return `+${phone.slice(0, 1)} ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  // Default: +XX XXXX XXXX
  return `+${phone}`;
}
```

## secrets.ts

Manejo seguro de secretos y configuracion.

### getSecret

Obtiene secreto con fallback.

```typescript
export function getSecret(name: string, required: boolean = true): string {
  const value = Deno.env.get(name);

  if (!value && required) {
    throw new Error(`Environment variable ${name} is required`);
  }

  return value ?? '';
}

// Uso
const middlewareUrl = getSecret('MIDDLEWARE_URL');
const optionalKey = getSecret('OPTIONAL_KEY', false);
```

### getSupabaseClient

Crea cliente Supabase con service_role.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient() {
  return createClient(
    getSecret('SUPABASE_URL'),
    getSecret('SUPABASE_SERVICE_ROLE_KEY'),
  );
}

// Uso
const supabase = getSupabaseClient();
```

### getSupabaseClientWithAuth

Crea cliente Supabase con token de usuario.

```typescript
export function getSupabaseClientWithAuth(token: string) {
  return createClient(
    getSecret('SUPABASE_URL'),
    getSecret('SUPABASE_ANON_KEY'),
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
}
```

## Uso Combinado

Ejemplo de funcion usando todas las utilidades:

```typescript
// supabase/functions/my-function/index.ts
import { getSupabaseClient, getSecret } from '../_shared/secrets.ts';
import { verifyAuth, getTenantFromUser } from '../_shared/auth.ts';
import { normalizePhoneNumber } from '../_shared/phone.ts';
import { decrypt } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    // Verificar auth
    const user = await verifyAuth(req, supabase);
    const tenantId = await getTenantFromUser(supabase, user.id);

    // Obtener y procesar datos
    const { phone, action } = await req.json();
    const normalizedPhone = normalizePhoneNumber(phone);

    // Obtener credenciales
    const { data: creds } = await supabase
      .from('tenant_credentials')
      .select('whatsapp_credential')
      .eq('tenant_id', tenantId)
      .single();

    const apiKey = await decrypt(creds.whatsapp_credential);

    // Usar API externa
    const response = await fetch(getSecret('MIDDLEWARE_URL') + '/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: normalizedPhone, action }),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

## Siguiente Paso

Continua con [Functions detalladas](./functions/) para documentacion especifica de cada funcion.
