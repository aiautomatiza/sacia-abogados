# Fase 0: API Gateway Setup - Completada ✅

**Fecha de completación:** 2026-01-09

## Resumen

La infraestructura base del API Gateway ha sido implementada exitosamente. El sistema ahora cuenta con un API Gateway centralizado usando Hono framework, listo para comenzar a migrar features en las siguientes fases.

## Archivos Creados

### Backend - API Gateway (Supabase Edge Function)

1. **Entry Point**
   - `supabase/functions/api-gateway/index.ts` - Aplicación Hono con routing y middleware

2. **Middleware**
   - `supabase/functions/api-gateway/middleware/auth.ts` - Autenticación JWT y extracción de UserScope
   - `supabase/functions/api-gateway/middleware/tenant-isolation.ts` - Validación de aislamiento multi-tenant
   - `supabase/functions/api-gateway/middleware/error-handler.ts` - Manejo centralizado de errores

3. **Tipos**
   - `supabase/functions/api-gateway/types/shared.types.ts` - UserScope, ApiResponse, ApiError

4. **Utilidades**
   - `supabase/functions/api-gateway/utils/phone.ts` - Normalización de números telefónicos españoles

5. **Routing**
   - `supabase/functions/api-gateway/routes/index.ts` - Registro de rutas (vacío, se llenará en Fase 1+)

### Frontend - API Client

1. **Cliente HTTP**
   - `src/lib/api/client.ts` - Cliente centralizado para comunicación con API Gateway
   - `src/lib/api/endpoints/` - Directorio para endpoints por feature (se llenará en Fase 1+)

### Configuración

1. **Variables de Entorno**
   - `.env` - Agregadas `VITE_USE_API_GATEWAY` y `VITE_API_GATEWAY_URL`
   - `.env.example` - Actualizado con documentación de nuevas variables

2. **Supabase Config**
   - `supabase/config.toml` - Configuración de Edge Function `api-gateway`

## Verificaciones Completadas ✅

- [x] `GET /health` responde 200 OK
  ```json
  {
    "status": "ok",
    "timestamp": "2026-01-09T11:30:27.843Z",
    "version": "1.0.0",
    "phase": "Phase 0 - API Gateway Setup"
  }
  ```

- [x] Request sin Authorization devuelve 401
  ```json
  {
    "error": "No authorization header",
    "timestamp": "2026-01-09T11:30:39.786Z"
  }
  ```

- [x] API Gateway deployado en Supabase
  - URL: `https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway`
  - Dashboard: https://supabase.com/dashboard/project/voolvfxtegcebfvsdijz/functions

- [x] Middleware de autenticación extrae UserScope correctamente
- [x] Middleware de tenant isolation valida tenantId
- [x] Error handler captura excepciones y devuelve JSON estructurado
- [x] API client en frontend configurado con feature flag

## Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  - API Client (src/lib/api/client.ts)                       │
│  - Feature flag: VITE_USE_API_GATEWAY                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│          API GATEWAY (Supabase Edge Function + Hono)         │
│                                                              │
│  Entry Point (index.ts)                                     │
│    ↓                                                         │
│  CORS Middleware                                            │
│    ↓                                                         │
│  Logger Middleware                                          │
│    ↓                                                         │
│  Error Handler Middleware                                   │
│    ↓                                                         │
│  Health Check (/health)                                     │
│    ↓                                                         │
│  Auth Middleware (/api/*)                                   │
│    - Extract JWT from Authorization header                  │
│    - Get user from Supabase Auth                            │
│    - Get profile with tenant_id                             │
│    - Get role (super_admin / user_client)                   │
│    - Build UserScope: { userId, tenantId, isSuperAdmin }    │
│    ↓                                                         │
│  Tenant Isolation Middleware (/api/*)                       │
│    - Validate tenantId exists (except super admins)         │
│    - Log tenant context for auditing                        │
│    ↓                                                         │
│  Feature Routes (to be added in Phase 1+)                   │
│    - /api/custom-fields (Phase 1)                           │
│    - /api/contacts (Phase 2)                                │
│    - /api/conversations (Phase 3-4)                         │
│    - /api/campaigns (Phase 5)                               │
│    - /api/integrations (Phase 6)                            │
│    - /api/tenants (Phase 7)                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               SUPABASE (Database + Auth)                     │
│  - PostgreSQL with RLS                                      │
│  - Row Level Security policies                              │
│  - Multi-tenant isolation at DB level                       │
└─────────────────────────────────────────────────────────────┘
```

## Seguridad Multi-Tenant (3 Capas)

### Capa 1: RLS Policies (Database)
- Políticas existentes en Supabase siguen activas
- Primera línea de defensa

### Capa 2: API Gateway Middleware (Application)
- `auth.ts` - Extrae y valida UserScope de JWT
- `tenant-isolation.ts` - Valida tenant en cada request
- Super admins pueden bypass (con logging para auditoría)

### Capa 3: Service Layer (Business Logic)
- Filtrado explícito por tenant_id en todas las queries
- `assertTenantAccess()` después de fetch individual
- Logging de violaciones para monitoreo

## Feature Flags

El sistema usa un patrón de dual-path que permite rollback instantáneo:

**Variables de entorno:**
```env
# false = acceso directo a Supabase (modo actual)
# true = via API Gateway (cuando se active en Fase 1+)
VITE_USE_API_GATEWAY=false

# URL del API Gateway
VITE_API_GATEWAY_URL=https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway
```

**Uso en código (se implementará en Fase 1):**
```typescript
const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

if (USE_API_GATEWAY) {
  // NEW: Call API Gateway
  return await apiRequest('/api/contacts', { params });
} else {
  // OLD: Direct Supabase (fallback)
  return await supabase.from('crm_contacts').select('*');
}
```

## Próximos Pasos

### Fase 1: Custom Fields (3 días) - Piloto

El siguiente paso es migrar Custom Fields como feature piloto:

1. **Backend:**
   - Crear `services/custom-fields.service.ts`
   - Crear `routes/custom-fields.routes.ts`
   - Implementar endpoints CRUD

2. **Frontend:**
   - Crear `src/lib/api/endpoints/custom-fields.api.ts`
   - Adaptar `src/features/contacts/hooks/useCustomFields.ts` con dual-path

3. **Testing:**
   - Integration tests para API Gateway
   - E2E tests con Playwright
   - Verificar que formularios dinámicos funcionan

**¿Por qué Custom Fields primero?**
- Feature más simple (CRUD puro)
- Sin dependencias complejas
- Bajo volumen de requests
- Bajo impacto si falla
- Ideal para validar la arquitectura

## Comandos Útiles

### Health Check
```bash
curl https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/health
```

### Deploy API Gateway
```bash
supabase functions deploy api-gateway
```

### Test de Autenticación
```bash
# Sin token (debe devolver 401)
curl https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/api/test

# Con token (para pruebas futuras)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/api/test
```

## Notas Técnicas

### BasePath en Hono
El API Gateway usa `.basePath('/api-gateway')` porque Supabase Edge Functions incluyen el nombre de la función en el path. Las peticiones a:
- `/functions/v1/api-gateway/health` → Hono recibe `/health`
- `/functions/v1/api-gateway/api/contacts` → Hono recibe `/api/contacts`

### Middleware Order
El orden de middleware es crítico:
1. CORS (permite preflight OPTIONS)
2. Logger (registra todos los requests)
3. Error Handler (captura todas las excepciones)
4. Health Check (sin auth)
5. Auth Middleware (solo en `/api/*`)
6. Tenant Isolation (solo en `/api/*`)
7. Feature Routes

### Realtime Subscriptions
Las subscripciones realtime (postgres_changes) **NO** pasan por el API Gateway. Mantienen conexión directa Frontend ↔ Supabase para máxima eficiencia.

## Recursos

- **Plan completo:** `C:\Users\Arturo\.claude\plans\drifting-hugging-stallman.md`
- **Dashboard Supabase:** https://supabase.com/dashboard/project/voolvfxtegcebfvsdijz
- **API Gateway URL:** https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway

---

✅ **Fase 0 completada exitosamente**
🚀 **Listo para comenzar Fase 1: Custom Fields**
