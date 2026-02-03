# Dashboard CRM Multi-Tenant - Documentación

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.81-green.svg)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)

> Sistema CRM y dashboard de comunicaciones multi-tenant para gestionar conversaciones de clientes a través de WhatsApp, Instagram, webchat, email y llamadas de voz.

---

## Quick Start (5 minutos)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url>
cd dashboard-consultoria-abogados

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de Supabase

# 4. Iniciar servidor de desarrollo
npm run dev
# Abrir http://localhost:8080
```

Ver [Setup Local](./01-getting-started/setup-local.md) para instrucciones detalladas.

---

## Navegacion Rapida

### Para Desarrolladores Nuevos

| Documento | Descripcion |
|-----------|-------------|
| [Setup Local](./01-getting-started/setup-local.md) | Instalacion paso a paso |
| [Variables de Entorno](./01-getting-started/environment-variables.md) | Configuracion de .env |
| [Estructura del Proyecto](./01-getting-started/project-structure.md) | Tour por las carpetas |
| [Stack Tecnologico](./02-architecture/tech-stack.md) | Tecnologias utilizadas |

### Arquitectura

| Documento | Descripcion |
|-----------|-------------|
| [Vision General](./02-architecture/README.md) | Arquitectura del sistema |
| [Multi-Tenancy](./02-architecture/multi-tenancy.md) | Aislamiento de datos por tenant |
| [Data Flow](./02-architecture/data-flow.md) | Flujo de datos Component -> DB |
| [State Management](./02-architecture/state-management.md) | React Query + Context |
| [Realtime](./02-architecture/realtime.md) | Updates en tiempo real |
| [Autenticacion](./02-architecture/authentication.md) | Auth y RBAC |

### Base de Datos

| Documento | Descripcion |
|-----------|-------------|
| [Schema Overview](./03-database/schema-overview.md) | Diagrama ER y tablas |
| [Tablas Reference](./03-database/tables-reference.md) | Listado de tablas |
| [RLS Policies](./03-database/rls-policies.md) | Politicas de seguridad |
| [Migraciones](./03-database/migrations-guide.md) | Como crear migraciones |

### Backend (Edge Functions)

| Documento | Descripcion |
|-----------|-------------|
| [Overview](./04-backend/README.md) | Supabase Edge Functions |
| [API Gateway](./04-backend/api-gateway.md) | Hono framework |
| [Functions Reference](./04-backend/functions-reference.md) | Listado de funciones |
| [Shared Utilities](./04-backend/shared-utilities.md) | Codigo compartido |

### Frontend

| Documento | Descripcion |
|-----------|-------------|
| [Overview](./05-frontend/README.md) | Arquitectura frontend |
| [Component Patterns](./05-frontend/component-patterns.md) | Patrones de componentes |
| [Custom Hooks](./05-frontend/custom-hooks.md) | Hooks pattern (TIER S) |
| [Routing](./05-frontend/routing.md) | React Router |
| [Forms](./05-frontend/forms-validation.md) | React Hook Form + Zod |

### Features

| Feature | Descripcion | Documento |
|---------|-------------|-----------|
| Admin | Gestion de tenants y usuarios | [admin.md](./06-features/admin.md) |
| Contacts | CRM con campos personalizados | [contacts.md](./06-features/contacts.md) |
| Conversations | Mensajeria multi-canal | [conversations.md](./06-features/conversations.md) |
| Calls | Seguimiento de llamadas | [calls.md](./06-features/calls.md) |
| Campaigns | Campanas broadcast | [campaigns.md](./06-features/campaigns.md) |
| Appointments | Sistema de citas | [appointments.md](./06-features/appointments.md) |
| Locations | Sedes fisicas | [locations.md](./06-features/locations.md) |
| Integrations | OAuth + sincronizacion | [integrations.md](./06-features/integrations.md) |

### Integraciones Externas

| Documento | Descripcion |
|-----------|-------------|
| [OAuth Flow](./07-integrations/oauth-flow.md) | Flujo OAuth completo |
| [WhatsApp Business](./07-integrations/whatsapp-business.md) | API de WhatsApp |
| [Twilio](./07-integrations/twilio.md) | Llamadas de voz |
| [Pipedrive](./07-integrations/pipedrive.md) | CRM externo |

### Deployment

| Documento | Descripcion |
|-----------|-------------|
| [Railway](./08-deployment/railway.md) | Deploy en Railway |
| [Supabase Setup](./08-deployment/supabase-setup.md) | Configurar Supabase |
| [Edge Functions](./08-deployment/edge-functions-deploy.md) | Deploy de funciones |
| [Troubleshooting](./08-deployment/troubleshooting.md) | Problemas comunes |

### Desarrollo

| Documento | Descripcion |
|-----------|-------------|
| [Code Style](./09-development/code-style.md) | Convenciones de codigo |
| [Agregar Feature](./09-development/adding-feature.md) | Como crear feature nueva |
| [Agregar Tabla](./09-development/adding-table.md) | Como crear tabla nueva |
| [Testing](./09-development/testing-guide.md) | Guia de testing |

### API Reference

| Documento | Descripcion |
|-----------|-------------|
| [REST Endpoints](./10-api-reference/rest-endpoints.md) | API Gateway endpoints |
| [RPC Functions](./10-api-reference/rpc-functions.md) | Funciones SQL |

---

## Comandos Esenciales

```bash
# Desarrollo
npm run dev              # Servidor en puerto 8080

# Build
npm run build            # Build de produccion
npm run build:dev        # Build de desarrollo

# Calidad de codigo
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Testing
npm run test             # Vitest
npm run test:ui          # Vitest UI
npm run test:e2e         # Playwright
```

---

## Diagramas

### Arquitectura del Sistema
```
                     [Frontend - React/Vite]
                              |
                              v
                     [Supabase Client]
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         [Auth]         [Database]      [Realtime]
              |               |               |
              +---------------+---------------+
                              |
                              v
                     [PostgreSQL + RLS]
                              |
                              v
                     [Edge Functions]
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         [WhatsApp]      [Twilio]      [Pipedrive]
```

### Data Flow
```
Component --> Custom Hook --> Service Layer --> Supabase Client --> Database
                 |
                 v
          React Query Cache
                 |
                 v
          Realtime Updates
                 |
                 v
     Automatic Cache Invalidation
```

---

## Mantenimiento de la Documentacion

### Regla de la Modificacion

> Cuando modificas codigo que afecta documentacion, actualiza la doc en el mismo PR.

### Checklist de PR

```markdown
## Documentacion
- [ ] Docs actualizadas con los cambios
- [ ] Ejemplos de codigo funcionan
- [ ] Links verificados
```

---

## Contribuir

1. Lee [Code Style](./09-development/code-style.md)
2. Sigue [Agregar Feature](./09-development/adding-feature.md) para nuevas features
3. Actualiza la documentacion relevante
4. Crea PR con descripcion clara

---

## Soporte

Para problemas:
1. Revisa [Troubleshooting](./08-deployment/troubleshooting.md)
2. Busca en la documentacion
3. Contacta al equipo de desarrollo
