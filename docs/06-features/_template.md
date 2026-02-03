# [Feature Name]

## Descripcion

[1-2 parrafos describiendo el proposito de esta feature]

## Casos de Uso

1. [Caso de uso 1]
2. [Caso de uso 2]
3. [Caso de uso 3]

## Estructura de Archivos

```
src/features/[feature-name]/
├── components/
│   ├── FeatureList.tsx
│   ├── FeatureForm.tsx
│   └── FeatureCard.tsx
├── hooks/
│   ├── useFeature.ts
│   └── useFeatureMutations.ts
├── services/
│   └── feature.service.ts
├── types/
│   └── index.ts
└── utils/
    └── helpers.ts
```

## Base de Datos

### Tablas Principales

| Tabla | Descripcion |
|-------|-------------|
| `table_name` | [Descripcion] |

### Relaciones

```
table_a
    │
    └──► table_b (1:N)
```

### Campos Clave

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador |
| `tenant_id` | UUID | FK a tenants |

## Hooks

### useFeature

Query principal para obtener datos.

```typescript
const { data, isLoading, error } = useFeature(filters, page);
```

**Parametros:**
- `filters` - Filtros a aplicar
- `page` - Pagina actual

**Retorna:**
- `data` - Datos paginados
- `isLoading` - Estado de carga
- `error` - Error si existe

### useFeatureMutations

Operaciones CRUD.

```typescript
const { create, update, delete } = useFeatureMutations();
```

**Mutations:**
- `create.mutate(data)` - Crear nuevo
- `update.mutate({ id, data })` - Actualizar
- `delete.mutate(id)` - Eliminar

## Componentes

### FeatureList

Lista de items.

```typescript
<FeatureList
  items={items}
  onSelect={(item) => handleSelect(item)}
/>
```

### FeatureForm

Formulario de creacion/edicion.

```typescript
<FeatureForm
  defaultValues={item}
  onSubmit={(data) => handleSubmit(data)}
  isLoading={mutation.isPending}
/>
```

## Rutas

| Ruta | Componente | Permisos |
|------|------------|----------|
| `/feature` | FeaturePage | user_client |
| `/feature/:id` | FeatureDetail | user_client |

## Edge Functions

| Funcion | Descripcion |
|---------|-------------|
| `function-name` | [Descripcion] |

## Realtime

```typescript
useRealtime({
  subscriptions: [{
    table: 'table_name',
    filter: `tenant_id=eq.${tenantId}`,
    queryKeysToInvalidate: [['feature', tenantId]],
  }],
});
```

## Flujo de Datos

```
1. Usuario realiza accion
2. Hook mutation se ejecuta
3. Service llama a Supabase
4. DB se actualiza
5. Realtime dispara evento
6. Cache se invalida
7. UI se actualiza
```

## Validaciones

```typescript
const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});
```

## Permisos

| Accion | user_client | super_admin |
|--------|-------------|-------------|
| Ver | Si | Si |
| Crear | Si | Si |
| Editar | Si | Si |
| Eliminar | Si | Si |

## Consideraciones

- [Consideracion 1]
- [Consideracion 2]

## Mejoras Futuras

- [ ] [Mejora 1]
- [ ] [Mejora 2]
