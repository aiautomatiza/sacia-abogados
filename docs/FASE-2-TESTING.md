# Guía de Testing - Fase 2: Contacts

## Resumen

La Fase 2 migra los endpoints de **Contacts** al API Gateway con las siguientes características:

- ✅ CRUD completo de contactos
- ✅ Normalización automática de teléfonos españoles a E.164 (+34)
- ✅ Detección de duplicados (tenant + numero)
- ✅ Sincronización con middleware externo (si tenant tiene integraciones activas)
- ✅ Búsqueda por número/nombre
- ✅ Paginación
- ✅ Operación bulk delete
- ✅ Custom fields en attributes (JSON)

## Endpoints Implementados

### GET /api/contacts
Lista paginada de contactos del tenant

**Query params:**
- `search` (opcional) - Búsqueda por número o nombre
- `page` (opcional, default: 1)
- `pageSize` (opcional, default: 30)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "numero": "+34666123456",
      "nombre": "Juan Pérez",
      "attributes": {
        "email": "juan@example.com",
        "company": "Acme Corp"
      },
      "created_at": "2024-01-09T...",
      "updated_at": "2024-01-09T..."
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 30,
    "total": 150,
    "totalPages": 5
  }
}
```

### GET /api/contacts/:id
Obtiene un contacto por ID

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "numero": "+34666123456",
  "nombre": "Juan Pérez",
  "attributes": {},
  "created_at": "...",
  "updated_at": "..."
}
```

### POST /api/contacts
Crea un nuevo contacto

**Request body:**
```json
{
  "numero": "666123456",
  "nombre": "Juan Pérez",
  "attributes": {
    "email": "juan@example.com",
    "company": "Acme Corp"
  },
  "skip_external_sync": false
}
```

**Features:**
- Normaliza `numero` a E.164 format (+34666123456)
- Verifica duplicados (tenant + numero)
- Si tenant tiene integraciones activas Y contacto tiene email → Notifica middleware

**Response:** Contact object (201 Created)

### PATCH /api/contacts/:id
Actualiza un contacto existente

**Request body (todos los campos opcionales):**
```json
{
  "numero": "666999888",
  "nombre": "Juan Pérez García",
  "attributes": {
    "email": "nuevo@example.com",
    "notes": "Cliente VIP"
  }
}
```

**Response:** Updated contact object

### DELETE /api/contacts/:id
Elimina un contacto

**Response:**
```json
{
  "success": true
}
```

### POST /api/contacts/bulk-delete
Elimina múltiples contactos

**Request body:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Límites:**
- Mínimo: 1 ID
- Máximo: 100 IDs

**Response:**
```json
{
  "success": true,
  "deletedCount": 3
}
```

---

## Plan de Testing

### Pre-requisitos

1. API Gateway deployado correctamente
2. Feature flag `VITE_USE_API_GATEWAY=false` (empezar con Supabase directo)
3. Dev server corriendo

### Fase 1: Testing con Supabase Directo (Baseline)

**Objetivo:** Verificar que todo funciona correctamente ANTES de activar el API Gateway.

```bash
# Asegurar que feature flag está desactivado
grep VITE_USE_API_GATEWAY .env
# Debe mostrar: VITE_USE_API_GATEWAY=false
```

**Tests manuales:**

1. **Listar contactos**
   - [ ] Ir a /contacts
   - [ ] Verificar que carga la lista
   - [ ] Probar búsqueda por nombre
   - [ ] Probar búsqueda por teléfono

2. **Crear contacto**
   - [ ] Click en "Nuevo Contacto"
   - [ ] Ingresar número: `666123456` (sin prefijo)
   - [ ] Ingresar nombre: "Test Baseline"
   - [ ] Agregar email en custom field
   - [ ] Guardar
   - [ ] Verificar que se guardó con número normalizado: `+34666123456`

3. **Editar contacto**
   - [ ] Abrir el contacto creado
   - [ ] Editar nombre a "Test Baseline Updated"
   - [ ] Agregar notas
   - [ ] Guardar
   - [ ] Verificar que se actualizó

4. **Eliminar contacto**
   - [ ] Seleccionar el contacto
   - [ ] Click en eliminar
   - [ ] Confirmar
   - [ ] Verificar que desapareció de la lista

5. **Bulk delete**
   - [ ] Crear 3 contactos de prueba
   - [ ] Seleccionar los 3
   - [ ] Click en "Eliminar seleccionados"
   - [ ] Confirmar
   - [ ] Verificar que se eliminaron

**Resultado esperado:** ✅ Todo funciona correctamente

---

### Fase 2: Testing con API Gateway

**Activar el API Gateway:**

```bash
./scripts/activate-api-gateway.sh
```

**Reiniciar dev server:**

```bash
# Detener con Ctrl+C
npm run dev
```

**Verificar en consola del navegador que el flag está activo:**

```javascript
// En DevTools Console
import.meta.env.VITE_USE_API_GATEWAY
// Debe retornar: "true"
```

**Repetir TODOS los tests de la Fase 1:**

1. **Listar contactos**
   - [ ] Ir a /contacts
   - [ ] Verificar que carga la lista
   - [ ] **Verificar en Network tab:** Request a `/functions/v1/api-gateway/api/contacts`
   - [ ] Probar búsqueda por nombre
   - [ ] Probar búsqueda por teléfono

2. **Crear contacto**
   - [ ] Click en "Nuevo Contacto"
   - [ ] Ingresar número: `666987654` (sin prefijo)
   - [ ] Ingresar nombre: "Test API Gateway"
   - [ ] Agregar email: `test-api@example.com`
   - [ ] Guardar
   - [ ] **Verificar en Network tab:** POST a `/api-gateway/api/contacts`
   - [ ] Verificar que se guardó con número normalizado: `+34666987654`
   - [ ] **IMPORTANTE:** Si el tenant tiene integraciones activas, verificar logs del middleware

3. **Verificar normalización telefónica**
   - [ ] Crear contacto con número `0034666111222`
   - [ ] Verificar se guardó como `+34666111222`
   - [ ] Crear contacto con número `+34666333444`
   - [ ] Verificar se guardó como `+34666333444`
   - [ ] Intentar crear duplicado con mismo número
   - [ ] Verificar error 409: "A contact with phone number +34666111222 already exists"

4. **Editar contacto**
   - [ ] Abrir el contacto "Test API Gateway"
   - [ ] Editar nombre a "Test API Gateway Updated"
   - [ ] Cambiar número a `666555444`
   - [ ] Guardar
   - [ ] Verificar que se actualizó con número normalizado `+34666555444`

5. **Eliminar contacto**
   - [ ] Seleccionar un contacto
   - [ ] Click en eliminar
   - [ ] Confirmar
   - [ ] **Verificar en Network tab:** DELETE a `/api-gateway/api/contacts/:id`
   - [ ] Verificar que desapareció

6. **Bulk delete**
   - [ ] Crear 5 contactos de prueba
   - [ ] Seleccionar los 5
   - [ ] Click en "Eliminar seleccionados"
   - [ ] Confirmar
   - [ ] **Verificar en Network tab:** POST a `/api-gateway/api/contacts/bulk-delete`
   - [ ] Verificar que se eliminaron todos

7. **Custom fields**
   - [ ] Crear contacto con múltiples custom fields:
     - Email: `custom@test.com`
     - Company: "Test Company"
     - Notes: "Testing custom fields"
   - [ ] Guardar
   - [ ] Verificar que se guardaron en `attributes`
   - [ ] Editar y cambiar valores
   - [ ] Verificar que se actualizaron

**Resultado esperado:** ✅ Todo funciona IGUAL que con Supabase directo

---

### Fase 3: Testing de Seguridad Multi-Tenant

**Objetivo:** Verificar que el tenant isolation funciona correctamente.

**Tests:**

1. **Listar contactos de otro tenant** (solo para super admins)
   - [ ] Intentar acceder a contacto ID de otro tenant
   - [ ] Verificar error 404 o "Contact not found or access denied"

2. **Sin autenticación**
   - [ ] Abrir Network tab
   - [ ] Eliminar token de localStorage
   - [ ] Intentar cargar /contacts
   - [ ] Verificar error 401 Unauthorized

**Resultado esperado:** ✅ Seguridad multi-tenant intacta

---

### Fase 4: Testing de Integración con Middleware

**Pre-requisito:** Tenant con integraciones activas

**Tests:**

1. **Crear contacto CON email**
   - [ ] Crear contacto con email: `middleware-test@example.com`
   - [ ] Verificar logs en backend:
     ```
     [contacts] Checking active integrations for tenant: xxx
     [contacts] Tenant has active integrations: true
     [contacts] Notifying middleware: https://middleware-url/api/sync/contact
     [contacts] Middleware notified successfully
     ```
   - [ ] Verificar que el contacto se sincronizó con el CRM externo

2. **Crear contacto SIN email**
   - [ ] Crear contacto sin email
   - [ ] Verificar logs:
     ```
     [contacts] Contact has no email, skipping middleware sync
     ```
   - [ ] Verificar que NO se intentó sincronizar

3. **Crear contacto con flag `skip_external_sync=true`**
   - [ ] Usar API directamente o modificar código temporalmente
   - [ ] Crear contacto con `skip_external_sync: true`
   - [ ] Verificar logs:
     ```
     [contacts] External sync skipped per request parameter
     ```

**Resultado esperado:** ✅ Sincronización con middleware funciona correctamente

---

### Fase 5: Testing de Performance

**Objetivo:** Verificar que el API Gateway no introduce latencia significativa.

**Tests:**

1. **Medir latencia de listado**
   - [ ] Con Supabase directo: Anotar tiempo de carga en Network tab
   - [ ] Con API Gateway: Anotar tiempo de carga
   - [ ] Diferencia esperada: < 100ms

2. **Medir latencia de creación**
   - [ ] Con Supabase directo: Anotar tiempo de POST
   - [ ] Con API Gateway: Anotar tiempo de POST
   - [ ] Diferencia esperada: < 200ms

**Resultado esperado:** ✅ Performance similar o mejor

---

### Fase 6: Rollback Testing

**Objetivo:** Verificar que el rollback funciona instantáneamente.

**Tests:**

1. **Desactivar API Gateway**
   ```bash
   ./scripts/deactivate-api-gateway.sh
   ```

2. **Reiniciar dev server**
   ```bash
   npm run dev
   ```

3. **Verificar que vuelve a usar Supabase directo**
   - [ ] Ir a /contacts
   - [ ] Verificar en Network tab: Requests directos a Supabase (no a `/functions/`)
   - [ ] Crear, editar, eliminar contacto
   - [ ] Verificar que todo funciona

**Resultado esperado:** ✅ Rollback instantáneo y funcional

---

## Script Automatizado de Testing

Para testing automatizado de los endpoints (requiere JWT token):

```bash
# 1. Obtener JWT token
# En DevTools Console:
localStorage.getItem('sb-voolvfxtegcebfvsdijz-auth-token')
# Copiar el access_token

# 2. Exportar token
export JWT_TOKEN='tu-token-aqui'

# 3. Ejecutar tests
./scripts/test-contacts-api.sh
```

**El script verifica:**
- ✅ GET /contacts (listar)
- ✅ POST /contacts (crear)
- ✅ GET /contacts/:id (obtener)
- ✅ PATCH /contacts/:id (actualizar)
- ✅ Normalización telefónica (+34)
- ✅ DELETE /contacts/:id (eliminar)
- ✅ Búsqueda

---

## Checklist de Verificación Final

Antes de pasar a Fase 3 (Conversations), verificar:

- [ ] ✅ Todos los endpoints de Contacts funcionan
- [ ] ✅ Normalización de teléfonos a +34 funciona
- [ ] ✅ Detección de duplicados funciona (409 error)
- [ ] ✅ Custom fields se guardan en `attributes`
- [ ] ✅ Búsqueda por nombre/número funciona
- [ ] ✅ Paginación funciona
- [ ] ✅ Bulk delete funciona (hasta 100 contactos)
- [ ] ✅ Sincronización con middleware funciona (si aplica)
- [ ] ✅ Tenant isolation intacto (403/404 para otros tenants)
- [ ] ✅ Rollback funciona (cambiar flag a false)
- [ ] ✅ Performance aceptable (< 100ms extra latencia)
- [ ] ✅ 0 errores en logs durante 24h

---

## Problemas Conocidos y Soluciones

### Error: "Contact not found or access denied"
**Causa:** Intentando acceder a contacto de otro tenant
**Solución:** Verificar que el `tenant_id` del contacto coincide con el del usuario

### Error: "A contact with phone number +34XXX already exists"
**Causa:** Contacto duplicado (tenant + numero)
**Solución:** Esperado. El backend previene duplicados correctamente.

### Middleware sync no funciona
**Causa:** Tenant sin integraciones activas O contacto sin email
**Solución:** Verificar que el tenant tiene integraciones y que el contacto tiene email

### Performance lenta
**Causa:** Cold start de Edge Function
**Solución:** Esperar unos segundos. El primer request después de deploy es más lento.

---

## Logs para Debugging

**Backend (Edge Function logs):**
```bash
# Ver logs en tiempo real
npx supabase functions logs api-gateway --follow
```

**Frontend (Browser DevTools):**
- Network tab: Verificar requests a `/api-gateway/api/contacts`
- Console: Verificar errores o warnings

---

## Próximos Pasos

Una vez completada la Fase 2:
- ✅ Fase 0: API Gateway Setup (completada)
- ✅ Fase 1: Custom Fields (completada)
- ✅ Fase 2: Contacts (completada)
- ⏳ Fase 3: Conversations - Queries (siguiente)

**Iniciar Fase 3 cuando:**
- Fase 2 testeada exitosamente
- 0 errores en logs durante 24h
- Performance aceptable
- Team da aprobación
