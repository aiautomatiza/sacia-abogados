# Arquitectura del Sistema

Vision general de la arquitectura del Dashboard CRM Multi-Tenant.

## Contenido

1. [Tech Stack](./tech-stack.md) - Tecnologias utilizadas
2. [Multi-Tenancy](./multi-tenancy.md) - Aislamiento de datos
3. [Data Flow](./data-flow.md) - Flujo de datos
4. [State Management](./state-management.md) - Manejo de estado
5. [Realtime](./realtime.md) - Updates en tiempo real
6. [Authentication](./authentication.md) - Auth y RBAC

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vite)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Pages     │  │  Features   │  │   Hooks     │  │  Contexts   │        │
│  │ (Routes)    │  │ (Modules)   │  │ (Data)      │  │ (Auth)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                        │
│                          ┌─────────┴─────────┐                              │
│                          │  Supabase Client  │                              │
│                          └─────────┬─────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────┴───────┐ ┌──────┴──────┐ ┌──────┴──────┐
            │     Auth      │ │  Database   │ │  Realtime   │
            │   (JWT/RLS)   │ │ (PostgreSQL)│ │ (Websocket) │
            └───────┬───────┘ └──────┬──────┘ └──────┬──────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              SUPABASE                                       │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐  │
│  │                        PostgreSQL Database                             │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Row Level Security (RLS)                       │ │  │
│  │  │              tenant_id filtering on ALL tables                    │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Edge Functions (Deno)                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │ API Gateway │  │  Webhooks   │  │   Cron      │                   │  │
│  │  │   (Hono)    │  │  Handlers   │  │   Jobs      │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────┴───────┐ ┌───────┴───────┐ ┌───────┴───────┐
            │   WhatsApp    │ │    Twilio     │ │   Pipedrive   │
            │   Business    │ │    (Calls)    │ │     (CRM)     │
            └───────────────┘ └───────────────┘ └───────────────┘
```

## Principios de Arquitectura

### 1. Multi-Tenant First

Cada pieza de datos esta aislada por `tenant_id`:
- Base de datos: RLS policies
- Frontend: Filtrado en queries
- Edge Functions: Validacion de tenant

### 2. Feature-Based Organization

Codigo organizado por dominio de negocio:
```
src/features/
├── contacts/      # Todo lo relacionado a contactos
├── conversations/ # Todo lo relacionado a mensajes
└── ...
```

### 3. Unidirectional Data Flow

```
User Action → Hook → Service → Supabase → Database
                                    ↓
                              Realtime Event
                                    ↓
                           Cache Invalidation
                                    ↓
                              UI Update
```

### 4. Type Safety

TypeScript end-to-end:
- Tipos de DB auto-generados
- Tipos de feature definidos
- Validacion con Zod

## Capas de la Aplicacion

### Capa de Presentacion (Frontend)

| Componente | Responsabilidad |
|------------|-----------------|
| Pages | Rutas y layout de pagina |
| Features | Componentes de dominio |
| Components | UI reutilizable |
| Hooks | Logica y datos |
| Contexts | Estado global |

### Capa de Datos (Hooks + Services)

| Componente | Responsabilidad |
|------------|-----------------|
| useX | Queries (lectura) |
| useXMutations | Mutations (escritura) |
| service.ts | Llamadas a Supabase |

### Capa de Persistencia (Supabase)

| Componente | Responsabilidad |
|------------|-----------------|
| PostgreSQL | Almacenamiento |
| RLS | Seguridad por tenant |
| Realtime | Eventos en vivo |
| Auth | Autenticacion |

### Capa de Integracion (Edge Functions)

| Componente | Responsabilidad |
|------------|-----------------|
| API Gateway | Endpoints REST |
| Webhooks | Recibir eventos externos |
| Background Jobs | Tareas asincronas |

## Flujos Principales

### Autenticacion

```
1. Usuario ingresa credenciales
2. Supabase Auth valida
3. Se obtiene JWT + perfil
4. Se determina tenant_id
5. RLS filtra datos automaticamente
```

### CRUD Operations

```
1. Usuario realiza accion
2. Hook llama a service
3. Service ejecuta query Supabase
4. Mutation invalida cache
5. Realtime notifica cambios
6. UI se actualiza
```

### Realtime Updates

```
1. Cambio en base de datos
2. Postgres trigger dispara evento
3. Supabase Realtime lo envia via WebSocket
4. useRealtime hook recibe el evento
5. React Query invalida queries
6. UI se re-renderiza
```

## Decisiones de Arquitectura

### Por que React Query?

- Cache automatico
- Invalidacion inteligente
- Loading/error states
- Optimistic updates
- Offline support

### Por que Supabase?

- PostgreSQL completo
- RLS nativo
- Realtime built-in
- Auth integrado
- Edge Functions

### Por que Feature-based?

- Escalabilidad
- Mantenibilidad
- Claridad de dominio
- Testing aislado

## Siguiente Paso

Continua con [Tech Stack](./tech-stack.md) para ver las tecnologias en detalle.
