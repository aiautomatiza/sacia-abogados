# Stack Tecnologico

Tecnologias utilizadas en el proyecto con versiones y justificaciones.

## Frontend

### Core

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **React** | 18.3 | UI library |
| **TypeScript** | 5.8 | Type safety |
| **Vite** | 5.4 | Build tool + dev server |

**Por que React?**
- Ecosistema maduro
- Gran comunidad
- Hooks para logica reutilizable
- React Query integration

**Por que TypeScript?**
- Deteccion de errores en compile time
- Mejor intellisense
- Documentacion en codigo
- Refactoring seguro

**Por que Vite?**
- Hot Module Replacement rapido
- Build optimizado
- Soporte nativo ESM
- Configuracion minima

### Routing

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **React Router** | 6.30 | Client-side routing |

### State Management

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **@tanstack/react-query** | 5.83 | Server state |
| **React Context** | - | Auth state |

**Por que React Query?**
- Cache automatico
- Deduplicacion de requests
- Background refetching
- Mutations con invalidacion
- Devtools excelentes

### Styling

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **Tailwind CSS** | 3.4 | Utility-first CSS |
| **shadcn-ui** | latest | Componentes UI |
| **Radix UI** | varios | Primitivos accesibles |
| **tailwind-merge** | 2.6 | Merge de clases |
| **class-variance-authority** | 0.7 | Variants de componentes |

**Por que Tailwind?**
- Desarrollo rapido
- Consistencia de diseno
- Bundle size optimizado
- Dark mode facil

**Por que shadcn-ui?**
- Componentes accesibles
- Totalmente customizables
- No es una dependencia (se copia al proyecto)
- Basado en Radix UI

### Forms & Validation

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **React Hook Form** | 7.61 | Manejo de formularios |
| **Zod** | 3.25 | Validacion de schemas |
| **@hookform/resolvers** | 3.10 | Integracion RHF + Zod |

**Por que React Hook Form?**
- Performance (uncontrolled)
- API simple
- Validacion integrada
- DevTools

**Por que Zod?**
- TypeScript-first
- Inferencia de tipos
- Validacion runtime
- API declarativa

### UI Libraries

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **Lucide React** | 0.462 | Iconos |
| **Recharts** | 2.15 | Graficos |
| **Sonner** | 1.7 | Toast notifications |
| **date-fns** | 3.6 | Manejo de fechas |
| **react-day-picker** | 8.10 | Date picker |
| **cmdk** | 1.1 | Command palette |

### Data Processing

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **PapaParse** | 5.5 | CSV parsing |
| **xlsx** | 0.18 | Excel files |
| **@ffmpeg/ffmpeg** | 0.12 | Audio conversion |

### Tables

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **@tanstack/react-table** | 8.21 | Tablas headless |
| **@tanstack/react-virtual** | 3.13 | Virtualizacion |

## Backend

### Supabase

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **@supabase/supabase-js** | 2.81 | Cliente JavaScript |
| **PostgreSQL** | 15 | Base de datos |
| **PostgREST** | - | REST API automatica |
| **GoTrue** | - | Auth service |
| **Realtime** | - | WebSocket events |
| **Storage** | - | File storage |

**Por que Supabase?**
- PostgreSQL completo (no NoSQL limitado)
- RLS para multi-tenancy
- Realtime nativo
- Auth integrado
- Edge Functions (Deno)
- Open source

### Edge Functions

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **Deno** | latest | Runtime |
| **Hono** | latest | Web framework |

**Por que Edge Functions?**
- Logica de servidor
- Integraciones externas
- Webhooks
- Tareas programadas

**Por que Hono?**
- Ultra rapido
- API similar a Express
- TypeScript nativo
- Middleware system

## Development

### Testing

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **Vitest** | 4.0 | Unit/integration tests |
| **@testing-library/react** | 16.3 | React testing |
| **Playwright** | 1.57 | E2E testing |
| **jsdom** | 27.0 | DOM simulation |

### Code Quality

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| **ESLint** | 9.32 | Linting |
| **TypeScript ESLint** | 8.38 | TS rules |
| **Prettier** | - | Formatting (opcional) |

## Deployment

### Production

| Tecnologia | Proposito |
|------------|-----------|
| **Railway** | Hosting frontend |
| **Supabase Cloud** | Backend as a Service |
| **serve** | Static file server |

### Build

| Herramienta | Proposito |
|-------------|-----------|
| `npm run build` | Production build |
| `npm run preview` | Preview local |

## Diagrama de Stack

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  React  │ │  Vite   │ │Tailwind │ │ shadcn  │           │
│  │   18    │ │    5    │ │   CSS   │ │   ui    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  React  │ │  React  │ │   Zod   │ │ Lucide  │           │
│  │  Query  │ │  Router │ │         │ │  Icons  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         SUPABASE                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │PostgreSQL│ │  Auth   │ │Realtime │ │ Storage │           │
│  │   15    │ │ GoTrue  │ │   WS    │ │  Files  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────────────────────────────────────────┐           │
│  │              Edge Functions                  │           │
│  │         (Deno + Hono framework)             │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │WhatsApp │ │ Twilio  │ │Pipedrive│                       │
│  │Business │ │ (Calls) │ │  (CRM)  │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Versiones de Node

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Package.json Highlights

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "@tanstack/react-query": "^5.83.0",
    "@supabase/supabase-js": "^2.81.1",
    "react-router-dom": "^6.30.1",
    "react-hook-form": "^7.61.1",
    "zod": "^3.25.76",
    "tailwindcss": "^3.4.17"
  }
}
```

## Siguiente Paso

Continua con [Multi-Tenancy](./multi-tenancy.md) para entender el aislamiento de datos.
