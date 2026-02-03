# API Reference

Referencia de APIs del sistema.

## Contenido

1. [REST Endpoints](./rest-endpoints.md) - API Gateway endpoints
2. [RPC Functions](./rpc-functions.md) - Funciones SQL

## APIs Disponibles

### API Gateway (Edge Function)

Gateway REST centralizado para operaciones complejas.

**Base URL:** `https://<project>.supabase.co/functions/v1/api-gateway`

### PostgREST (Automatico)

API REST generada automaticamente desde el schema.

**Base URL:** `https://<project>.supabase.co/rest/v1`

### RPC Functions

Funciones SQL invocables via API.

**Endpoint:** `https://<project>.supabase.co/rest/v1/rpc/<function_name>`

## Autenticacion

### JWT (Frontend)

```typescript
const { data } = await supabase
  .from('table')
  .select('*');
// Token se incluye automaticamente
```

### API Key (External)

```typescript
const response = await fetch(url, {
  headers: {
    'x-tenant-id': 'tenant-uuid',
    'x-api-key': 'api-key',
  },
});
```

## Quick Reference

### PostgREST Queries

```typescript
// Select
supabase.from('contacts').select('*')

// Filter
.eq('status', 'active')
.ilike('name', '%juan%')
.in('type', ['a', 'b'])

// Pagination
.range(0, 49)

// Order
.order('created_at', { ascending: false })

// Count
.select('*', { count: 'exact' })
```

### RPC Functions

```typescript
// Llamar funcion
const { data } = await supabase.rpc('calculate_stats', {
  p_tenant_id: tenantId,
  p_date_from: '2024-01-01',
});
```

### Edge Functions

```typescript
// Invocar function
const { data } = await supabase.functions.invoke('function-name', {
  body: { param: 'value' },
});
```

## Errores Comunes

| Codigo | Significado |
|--------|-------------|
| 400 | Bad Request |
| 401 | No autenticado |
| 403 | Sin permisos (RLS) |
| 404 | No encontrado |
| 409 | Conflicto (duplicado) |
| 500 | Error interno |

## Rate Limits

| Tipo | Limite |
|------|--------|
| API requests | 1000/min |
| Realtime connections | 200 concurrent |
| Edge Function execution | 60s timeout |
