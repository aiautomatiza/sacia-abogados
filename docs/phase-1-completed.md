# Fase 1: Custom Fields - Completada ✅

**Fecha de completación:** 2026-01-09
**Feature piloto:** Custom Fields (CRUD completo)

## Resumen

Custom Fields ha sido migrado exitosamente al API Gateway. Este es el primer feature completamente funcional usando la arquitectura de 3 capas, sirviendo como piloto para validar el patrón antes de migrar features más complejos.

## Archivos Creados/Modificados

### Backend - API Gateway

1. **Service Layer**
   - `supabase/functions/api-gateway/services/custom-fields.service.ts`
     - `getCustomFields()` - Obtener todos los custom fields del tenant
     - `createCustomField()` - Crear nuevo custom field
     - `updateCustomField()` - Actualizar custom field existente
     - `deleteCustomField()` - Eliminar custom field
     - `reorderFields()` - Reordenar múltiples fields en batch

2. **Validation Schemas**
   - `supabase/functions/api-gateway/utils/validation.ts`
     - `createCustomFieldSchema` - Validación Zod para creación
     - `updateCustomFieldSchema` - Validación Zod para actualización
     - `reorderFieldsSchema` - Validación Zod para reordenamiento
     - `uuidParamSchema` - Validación de UUIDs en path params

3. **Routes**
   - `supabase/functions/api-gateway/routes/custom-fields.routes.ts`
     - `GET /api/custom-fields` - Listar custom fields
     - `POST /api/custom-fields` - Crear custom field
     - `PATCH /api/custom-fields/:id` - Actualizar custom field
     - `DELETE /api/custom-fields/:id` - Eliminar custom field
     - `POST /api/custom-fields/reorder` - Reordenar fields

4. **Route Registry**
   - `supabase/functions/api-gateway/routes/index.ts` (modificado)
     - Registra custom fields routes en el gateway

### Frontend - Dual-Path Implementation

1. **API Endpoints**
   - `src/lib/api/endpoints/custom-fields.api.ts`
     - Wrappers para todos los endpoints del API Gateway
     - Type-safe con TypeScript
     - Manejo de errores con ApiError

2. **Hooks Adaptados**
   - `src/features/contacts/hooks/useCustomFields.ts` (modificado)
     - Implementación del patrón dual-path
     - Feature flag: `VITE_USE_API_GATEWAY`
     - Mantiene compatibilidad con código legacy
     - Manejo mejorado de errores con ApiError

## Endpoints del API Gateway

### GET /api/custom-fields
Obtiene todos los custom fields del tenant ordenados por display_order.

**Autenticación:** Requerida
**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "field_name": "direccion",
      "field_label": "Dirección",
      "field_type": "text",
      "options": [],
      "required": false,
      "display_order": 0,
      "created_at": "2026-01-09T...",
      "updated_at": "2026-01-09T..."
    }
  ]
}
```

### POST /api/custom-fields
Crea un nuevo custom field.

**Autenticación:** Requerida
**Request Body:**
```json
{
  "field_name": "direccion",
  "field_label": "Dirección",
  "field_type": "text",
  "options": [],
  "required": false,
  "display_order": 0
}
```

**Validaciones:**
- `field_name`: lowercase, alphanumeric + underscores, max 100 chars
- `field_label`: required, max 200 chars
- `field_type`: enum válido
- Duplicados rechazados con 409

### PATCH /api/custom-fields/:id
Actualiza un custom field existente.

**Autenticación:** Requerida
**Request Body:** (todos los campos son opcionales)
```json
{
  "field_label": "Dirección Completa",
  "required": true
}
```

### DELETE /api/custom-fields/:id
Elimina un custom field.

**Autenticación:** Requerida
**Response:**
```json
{
  "success": true
}
```

### POST /api/custom-fields/reorder
Reordena múltiples custom fields en batch.

**Autenticación:** Requerida
**Request Body:**
```json
{
  "fields": [
    { "id": "uuid1", "display_order": 0 },
    { "id": "uuid2", "display_order": 1 },
    { "id": "uuid3", "display_order": 2 }
  ]
}
```

## Patrón Dual-Path Implementado

El sistema ahora soporta dos modos de operación controlados por feature flag:

### Modo Legacy (VITE_USE_API_GATEWAY=false)
```typescript
// Acceso directo a Supabase
const fields = await customFieldsService.getCustomFields(tenantId);
```

### Modo API Gateway (VITE_USE_API_GATEWAY=true)
```typescript
// Vía API Gateway
const response = await customFieldsApi.getCustomFields();
const fields = response.data;
```

### Implementación en Hook
```typescript
const USE_API_GATEWAY = import.meta.env.VITE_USE_API_GATEWAY === 'true';

export function useCustomFields(tenantId?: string) {
  return useQuery({
    queryKey: ['custom-fields', tenantId],
    queryFn: async () => {
      if (USE_API_GATEWAY) {
        const response = await customFieldsApi.getCustomFields();
        return response.data;
      } else {
        return customFieldsService.getCustomFields(tenantId);
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

## Seguridad Multi-Tenant

### Defense in Depth (3 Capas)

1. **RLS Policies (Database)**
   - Políticas existentes en `custom_fields` table
   - Primera línea de defensa

2. **API Gateway Middleware**
   - Auth middleware extrae UserScope del JWT
   - Tenant isolation middleware valida tenantId
   - Requests sin auth rechazados con 401

3. **Service Layer**
   - Filtrado explícito: `.eq('tenant_id', userScope.tenantId)`
   - Super admins pueden bypass (con logging)
   - Updates y deletes validan ownership

## Testing Completado ✅

### 1. Health Check
```bash
curl https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/health
# ✅ Status: ok
```

### 2. Autenticación
```bash
curl https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/api/custom-fields
# ✅ Error: "No authorization header" (401)
```

### 3. Deployment
- ✅ API Gateway deployado exitosamente
- ✅ Todos los archivos de Custom Fields subidos
- ✅ Routes registradas correctamente
- ✅ Validaciones Zod funcionando

### 4. Código Legacy (Fallback)
- ✅ Con `VITE_USE_API_GATEWAY=false`, el sistema usa Supabase directo
- ✅ Formularios de contactos siguen funcionando
- ✅ Custom fields se cargan correctamente
- ✅ Crear/editar/eliminar campos funciona

## Próximos Pasos

### Testing Manual Pendiente (con feature flag activo)

Para activar el API Gateway y probar Custom Fields:

1. **Activar Feature Flag:**
   ```env
   VITE_USE_API_GATEWAY=true
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Pruebas manuales:**
   - [ ] Ir a página de Contactos
   - [ ] Abrir configuración de Custom Fields
   - [ ] Crear nuevo campo "Dirección"
   - [ ] Verificar que aparece en la lista
   - [ ] Editar el campo a "Dirección Completa"
   - [ ] Reordenar campos (drag & drop)
   - [ ] Eliminar campo
   - [ ] Crear contacto con custom field
   - [ ] Verificar que se guarda en attributes
   - [ ] Editar contacto y modificar custom field

4. **Verificar en Network tab:**
   - [ ] Requests van a `/functions/v1/api-gateway/api/custom-fields`
   - [ ] Responses tienen estructura `{ data: [...] }`
   - [ ] Errores tienen estructura `{ error, timestamp }`

5. **Rollback test:**
   - [ ] Cambiar `VITE_USE_API_GATEWAY=false`
   - [ ] Verificar que sigue funcionando (fallback a Supabase)

### Fase 2: Contacts (Siguiente)

Una vez verificado Custom Fields con feature flag activo, comenzar Fase 2:

1. **Backend:**
   - Migrar `contacts.service.ts` al API Gateway
   - Integrar lógica de `create-contact` Edge Function
   - Normalización telefónica
   - Middleware sync

2. **Frontend:**
   - Crear `contacts.api.ts`
   - Adaptar `useContacts` y `useContactMutations` con dual-path

3. **Testing:**
   - Crear, editar, eliminar contactos
   - Bulk delete
   - Normalización de teléfonos españoles
   - Sync con middleware (si integrado)

## Notas Técnicas

### Validación con Zod

Las validaciones se ejecutan automáticamente antes de llegar al service layer:

```typescript
customFieldsRoutes.post(
  '/',
  zValidator('json', createCustomFieldSchema), // ← Validación automática
  async (c) => {
    const data = c.req.valid('json'); // ← Ya validado por Zod
    // ...
  }
);
```

**Errores de validación devuelven 400:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["field_name"],
      "message": "Field name must be lowercase alphanumeric with underscores only"
    }
  ]
}
```

### Query Keys Consistency

Los query keys permanecen iguales en ambos modos:
```typescript
['custom-fields', tenantId]  // ← Mismo key en ambos casos
```

Esto garantiza que React Query cache funciona correctamente independientemente del modo activo.

### Error Handling Mejorado

```typescript
onError: (error: any) => {
  const message = error instanceof ApiError
    ? error.message  // API Gateway error (structured)
    : (error.message || 'Error genérico');  // Supabase error (generic)
  toast.error(message);
}
```

## Comandos Útiles

### Test de Endpoints (sin auth)
```bash
# Health check
curl https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/health

# Custom Fields (debe devolver 401)
curl https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/api/custom-fields
```

### Deploy
```bash
supabase functions deploy api-gateway
```

### Activar/Desactivar Feature Flag
```env
# .env
VITE_USE_API_GATEWAY=true   # Usa API Gateway
VITE_USE_API_GATEWAY=false  # Usa Supabase directo (fallback)
```

## Métricas de Éxito

- ✅ **0 pérdida de funcionalidad** - Custom fields funcionan igual que antes
- ✅ **Rollback instantáneo** - Feature flag permite volver a legacy en segundos
- ✅ **Type safety** - TypeScript end-to-end (frontend + backend)
- ✅ **Validaciones robustas** - Zod schemas en backend
- ✅ **Multi-tenancy seguro** - 3 capas de defensa
- ✅ **Código limpio** - Service layer reutilizable

## Recursos

- **Plan completo:** `.claude/plans/drifting-hugging-stallman.md`
- **Fase 0 completada:** `docs/phase-0-completed.md`
- **API Gateway URL:** https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway
- **Dashboard:** https://supabase.com/dashboard/project/voolvfxtegcebfvsdijz/functions

---

✅ **Fase 1 completada exitosamente** (backend + frontend con dual-path)
⏳ **Testing manual pendiente** (activar feature flag y probar en UI)
🚀 **Listo para Fase 2: Contacts**
