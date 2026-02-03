# Variables de Entorno

Configuracion completa de las variables de entorno del proyecto.

## Archivo .env

Copia `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

## Variables Requeridas

### Supabase

| Variable | Descripcion | Donde obtenerla |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Dashboard > Settings > API > Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publica (anon) | Dashboard > Settings > API > anon/public |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto | Dashboard > Settings > General |

**Ejemplo:**
```env
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxOTM1NTYwMDAwfQ.xxxxx
VITE_SUPABASE_PROJECT_ID=xyzcompany
```

## Variables Opcionales

### Middleware (Integraciones OAuth)

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `VITE_MIDDLEWARE_URL` | URL del middleware de OAuth | - |

```env
VITE_MIDDLEWARE_URL=https://your-middleware.railway.app
```

Requerida solo si usas integraciones con servicios externos (Zoho, Pipedrive, etc.).

## Variables en Supabase Edge Functions

Las Edge Functions requieren sus propias variables de entorno, configuradas en el dashboard de Supabase:

**Dashboard > Edge Functions > Settings**

| Variable | Descripcion |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto (automatico) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role para operaciones admin |
| `MIDDLEWARE_URL` | URL del middleware externo |
| `DASHBOARD_URL` | URL del frontend (para redirects) |
| `ENCRYPTION_KEY` | Clave para encriptar credenciales |
| `ENCRYPTION_IV` | IV para encriptacion AES |

### Obtener SUPABASE_SERVICE_ROLE_KEY

1. Dashboard > Settings > API
2. Copiar **service_role key** (mantener en secreto)

**IMPORTANTE:** Nunca exponer `service_role` key en el frontend.

## Prefijo VITE_

Las variables que deben estar disponibles en el frontend **deben** tener el prefijo `VITE_`:

```env
# Disponible en frontend
VITE_SUPABASE_URL=https://...

# NO disponible en frontend (solo build time)
MY_SECRET_KEY=...
```

## Acceder a Variables en el Codigo

### Frontend (React)

```typescript
// Acceder a variables VITE_*
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

### Edge Functions (Deno)

```typescript
// Acceder a variables de Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

## Tipos TypeScript

El archivo `src/vite-env.d.ts` define los tipos:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_MIDDLEWARE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Validacion de Variables

El cliente de Supabase valida las variables al inicializarse:

```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase environment variables are required');
}
```

## Entornos Multiples

Para manejar diferentes entornos:

### Desarrollo
```bash
# .env.development
VITE_SUPABASE_URL=https://dev-project.supabase.co
```

### Produccion
```bash
# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
```

Vite carga automaticamente el archivo correcto segun el modo:
- `npm run dev` -> `.env.development` (o `.env`)
- `npm run build` -> `.env.production` (o `.env`)

## Seguridad

### NO hacer

```env
# NUNCA poner en el frontend
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
ENCRYPTION_KEY=...
```

### SI hacer

- Usar solo claves publicas (anon) en el frontend
- Guardar secretos en Supabase Edge Functions
- Usar RLS para seguridad de datos
- Rotar claves periodicamente

## Troubleshooting

### Variable undefined

```typescript
// Si import.meta.env.VITE_X es undefined:
// 1. Verificar que tiene prefijo VITE_
// 2. Reiniciar servidor dev despues de cambiar .env
// 3. Verificar que .env esta en la raiz del proyecto
```

### Error de autenticacion Supabase

1. Verificar que la URL no tiene slash final
2. Verificar que la key es la correcta (anon, no service_role)
3. Verificar que el proyecto Supabase esta activo

## Referencia Completa

```env
# ===================
# SUPABASE (Requerido)
# ===================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=your-project-id

# ===================
# MIDDLEWARE (Opcional)
# ===================
VITE_MIDDLEWARE_URL=https://your-middleware.railway.app
```
