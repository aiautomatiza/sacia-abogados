# Deployment

Guias de deployment del sistema.

## Contenido

1. [Railway](./railway.md) - Deploy del frontend
2. [Supabase Setup](./supabase-setup.md) - Configuracion de Supabase
3. [Edge Functions Deploy](./edge-functions-deploy.md) - Deploy de funciones
4. [Troubleshooting](./troubleshooting.md) - Problemas comunes

## Arquitectura de Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                        RAILWAY                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Frontend (React)                     │ │
│  │                                                         │ │
│  │  - Static files served by 'serve'                      │ │
│  │  - SPA routing                                          │ │
│  │  - Environment variables (VITE_*)                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Database   │  │     Auth     │  │   Storage    │      │
│  │  PostgreSQL  │  │    GoTrue    │  │    Files     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Realtime   │  │    Edge      │                        │
│  │  WebSocket   │  │  Functions   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Deploy

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Aplicar migraciones
3. Configurar Auth
4. Habilitar Realtime
5. Deploy Edge Functions

### 2. Railway

1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Deploy automatico

## Variables de Entorno

### Frontend (Railway)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx
VITE_MIDDLEWARE_URL=https://middleware.railway.app
```

### Edge Functions (Supabase)

```env
# Automaticas
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Manuales
MIDDLEWARE_URL=https://middleware.railway.app
DASHBOARD_URL=https://dashboard.railway.app
ENCRYPTION_KEY=...
ENCRYPTION_IV=...
```

## Comandos de Deploy

### Build frontend

```bash
npm run build
```

### Deploy Edge Functions

```bash
# Todas
supabase functions deploy

# Una especifica
supabase functions deploy function-name
```

### Aplicar migraciones

```bash
supabase db push
```

## Checklist de Deploy

### Pre-deploy

- [ ] Variables de entorno configuradas
- [ ] Migraciones aplicadas
- [ ] RLS policies habilitadas
- [ ] Realtime habilitado en tablas
- [ ] Edge Functions desplegadas

### Post-deploy

- [ ] Login funciona
- [ ] Datos se cargan
- [ ] Realtime funciona
- [ ] Edge Functions responden
- [ ] CORS configurado correctamente

## Dominios

| Servicio | URL |
|----------|-----|
| Frontend | `https://app.tudominio.com` |
| Supabase | `https://xxx.supabase.co` |
| Middleware | `https://middleware.tudominio.com` |

## Siguiente Paso

Comienza con [Railway](./railway.md) para deploy del frontend.
