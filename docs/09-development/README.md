# Development Guide

Guias para desarrollo en el proyecto.

## Contenido

1. [Code Style](./code-style.md) - Convenciones de codigo
2. [Adding Feature](./adding-feature.md) - Como crear nueva feature
3. [Adding Table](./adding-table.md) - Como crear tabla nueva
4. [Testing Guide](./testing-guide.md) - Guia de testing

## Ambiente de Desarrollo

### Requisitos

- Node.js >= 18
- npm >= 9
- Git
- VS Code (recomendado)

### Setup

```bash
git clone <repo>
cd dashboard-consultoria-abogados
npm install
cp .env.example .env
# Configurar .env
npm run dev
```

### Comandos

```bash
# Desarrollo
npm run dev              # Servidor en :8080

# Build
npm run build            # Produccion
npm run build:dev        # Desarrollo

# Calidad
npm run lint             # ESLint
npm run type-check       # TypeScript

# Testing
npm run test             # Vitest
npm run test:ui          # Vitest UI
npm run test:e2e         # Playwright
```

## Estructura de Commits

```
type(scope): description

feat(contacts): add bulk delete
fix(conversations): fix realtime connection
refactor(hooks): simplify useContacts
docs(readme): update setup instructions
```

### Tipos

| Tipo | Descripcion |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Correccion de bug |
| `refactor` | Refactorizacion |
| `docs` | Documentacion |
| `style` | Formateo |
| `test` | Tests |
| `chore` | Mantenimiento |

## Workflow de Desarrollo

### Nueva Feature

```
1. Crear branch: feature/nombre-feature
2. Desarrollar con commits atomicos
3. Verificar lint y types
4. Crear PR con descripcion clara
5. Review y merge
```

### Bug Fix

```
1. Crear branch: fix/descripcion-bug
2. Reproducir bug localmente
3. Escribir test que falla
4. Implementar fix
5. Verificar test pasa
6. PR y merge
```

## Patron de Feature

```
src/features/nueva-feature/
├── components/
├── hooks/
├── services/
├── types/
└── utils/
```

Ver [Adding Feature](./adding-feature.md) para detalle completo.

## Base de Datos

### Crear migracion

```bash
# Crear archivo
touch supabase/migrations/20260203_descripcion.sql
```

### Estructura

```sql
-- Crear tabla con RLS
CREATE TABLE nueva_tabla (...);
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;
CREATE INDEX ...;
```

Ver [Adding Table](./adding-table.md) para detalle completo.

## Testing

### Unit Tests (Vitest)

```typescript
// feature.test.ts
describe('Feature', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
// feature.spec.ts
test('user can create contact', async ({ page }) => {
  await page.goto('/contacts');
  await page.click('button:text("Crear")');
  // ...
});
```

Ver [Testing Guide](./testing-guide.md) para mas detalle.

## Debugging

### Frontend

```typescript
// Console
console.log('Debug:', variable);

// React DevTools
// Install extension

// React Query DevTools
// Ya incluido en desarrollo
```

### Edge Functions

```bash
# Logs locales
supabase functions serve --debug

# Logs en produccion
# Dashboard > Edge Functions > Logs
```

## Code Review Checklist

- [ ] Codigo sigue convenciones
- [ ] Tests agregados/actualizados
- [ ] Types correctos
- [ ] Sin console.log en produccion
- [ ] RLS policies si es nueva tabla
- [ ] Documentacion actualizada
