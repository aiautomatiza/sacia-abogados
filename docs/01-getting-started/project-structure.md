# Estructura del Proyecto

Tour completo por las carpetas y archivos del proyecto.

## Vision General

```
dashboard-consultoria-abogados/
├── docs/                       # Documentacion (estas leyendo esto)
├── public/                     # Assets estaticos
├── src/                        # Codigo fuente frontend
├── supabase/                   # Backend (Edge Functions + migraciones)
├── tests/                      # Tests E2E
├── .env                        # Variables de entorno (no commitear)
├── .env.example                # Ejemplo de variables
├── package.json                # Dependencias npm
├── tsconfig.json               # Configuracion TypeScript
├── vite.config.ts              # Configuracion Vite
├── tailwind.config.ts          # Configuracion Tailwind
├── railway.toml                # Configuracion Railway
└── CLAUDE.md                   # Instrucciones para AI
```

## /src - Codigo Fuente

### Estructura Principal

```
src/
├── components/                 # Componentes compartidos
│   ├── ui/                     # shadcn-ui components
│   └── layout/                 # Layout components
├── features/                   # Modulos por feature (patron principal)
├── hooks/                      # Hooks globales reutilizables
├── contexts/                   # React Contexts (Auth, Theme)
├── integrations/               # Cliente Supabase + tipos DB
├── lib/                        # Utilidades y validaciones
├── pages/                      # Componentes de pagina (rutas)
└── App.tsx                     # Entry point + Router
```

### /src/components

Componentes reutilizables en toda la aplicacion:

```
components/
├── ui/                         # shadcn-ui (auto-generados)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...                     # 40+ componentes
├── layout/
│   ├── AppLayout.tsx           # Layout principal con sidebar
│   ├── Sidebar.tsx             # Navegacion lateral
│   └── Header.tsx              # Header con usuario
└── shared/
    ├── LoadingSpinner.tsx
    ├── EmptyState.tsx
    └── ErrorBoundary.tsx
```

### /src/features - Patron Principal

**Cada feature es un modulo autocontenido:**

```
features/
├── admin/                      # Gestion de tenants y usuarios
├── appointments/               # Sistema de citas
├── calls/                      # Seguimiento de llamadas
├── campaigns/                  # Campanas broadcast
├── contacts/                   # CRM con campos personalizados
├── conversations/              # Mensajeria multi-canal
├── integrations/               # OAuth y sincronizacion
└── locations/                  # Sedes fisicas
```

**Estructura interna de cada feature:**

```
features/{feature-name}/
├── components/                 # UI especifica de esta feature
│   ├── FeatureList.tsx
│   ├── FeatureDetail.tsx
│   ├── FeatureForm.tsx
│   └── ...
├── hooks/                      # Hooks de datos
│   ├── useFeature.ts           # Query principal
│   ├── useFeatureMutations.ts  # Mutations CRUD
│   └── useFeatureFilters.ts    # Estado de filtros
├── services/                   # Capa de servicios
│   └── feature.service.ts      # Llamadas a Supabase
├── types/                      # TypeScript types
│   └── index.ts
└── utils/                      # Utilidades especificas
    └── helpers.ts
```

### /src/hooks - Hooks Globales

```
hooks/
├── use-realtime.ts             # Suscripciones realtime
├── use-auth.ts                 # Alias para useAuth context
├── use-role.ts                 # Role checking
├── use-profile.ts              # Perfil y tenant del usuario
├── use-mobile.ts               # Responsive detection
├── use-debounce.ts             # Debounce values
├── use-file-upload.ts          # Upload de archivos
├── use-audio-recorder.ts       # Grabacion de audio
└── use-audio-converter.ts      # Conversion FFmpeg
```

### /src/contexts

```
contexts/
├── auth-context.tsx            # AuthProvider + useAuth
└── theme-context.tsx           # ThemeProvider (opcional)
```

### /src/integrations

```
integrations/
└── supabase/
    ├── client.ts               # Cliente Supabase inicializado
    └── types.ts                # Tipos auto-generados del schema
```

### /src/lib

```
lib/
├── utils.ts                    # cn() y utilidades generales
├── validations/                # Schemas Zod
│   ├── contact.ts
│   ├── campaign.ts
│   └── ...
└── utils/
    ├── date.ts                 # Formateo de fechas
    └── format.ts               # Formateo general
```

### /src/pages

```
pages/
├── Index.tsx                   # Landing/redirect
├── Auth.tsx                    # Login/Register
├── Dashboard.tsx               # Dashboard principal
├── Contacts.tsx                # Listado de contactos
├── Conversations.tsx           # Inbox de conversaciones
├── Calls.tsx                   # Historial de llamadas
├── Campaigns.tsx               # Campanas
├── Appointments.tsx            # Citas
├── Locations.tsx               # Sedes
├── Integrations.tsx            # Integraciones
├── OAuthCallback.tsx           # Callback OAuth
├── Settings.tsx                # Configuracion
├── AcceptInvitation.tsx        # Aceptar invitacion
└── NotFound.tsx                # 404
```

## /supabase - Backend

### Estructura

```
supabase/
├── functions/                  # Edge Functions (Deno)
│   ├── _shared/                # Codigo compartido
│   │   ├── auth.ts             # Verificacion de auth
│   │   ├── crypto.ts           # Encriptacion
│   │   ├── phone.ts            # Normalizacion telefonos
│   │   └── secrets.ts          # Manejo de secretos
│   ├── api-gateway/            # API Gateway (Hono)
│   ├── create-contact/
│   ├── send-campaign/
│   ├── initiate-oauth/
│   ├── handle-oauth-callback/
│   ├── sync-contacts/
│   └── ...                     # 19 funciones totales
├── migrations/                 # Migraciones SQL
│   ├── 20251113_initial.sql
│   ├── 20260103_add_integration_tables.sql
│   └── ...                     # 37 migraciones
└── config.toml                 # Configuracion Supabase
```

### Edge Functions

| Function | Descripcion |
|----------|-------------|
| `api-gateway` | Gateway REST centralizado (Hono) |
| `create-contact` | Crear contacto desde externo |
| `send-campaign` | Enviar campana broadcast |
| `initiate-oauth` | Iniciar flujo OAuth |
| `handle-oauth-callback` | Procesar callback OAuth |
| `sync-contacts` | Sincronizar contactos |
| `invite-user` | Invitar usuario |
| `complete-invitation` | Completar invitacion |
| `manage-tenants` | CRUD de tenants |
| `send-conversation-message` | Enviar mensaje |
| `send-template-message` | Enviar template WhatsApp |
| `process-campaign-queue` | Procesar cola de campanas |
| `process-whatsapp-attachment` | Procesar adjuntos |
| `external-appointments-api` | API externa de citas |
| `external-contact-api` | API externa de contactos |
| `manage-tenant-settings` | Configuracion de tenant |
| `import-contacts` | Importar contactos masivo |
| `sync-contact-from-external` | Sync contacto individual |
| `migrate-credentials` | Migracion de credenciales |

## /tests - Tests E2E

```
tests/
├── e2e/
│   ├── auth.spec.ts
│   ├── contacts.spec.ts
│   └── ...
└── fixtures/
    └── test-data.ts
```

## Archivos de Configuracion

| Archivo | Proposito |
|---------|-----------|
| `package.json` | Dependencias y scripts npm |
| `tsconfig.json` | Configuracion TypeScript |
| `vite.config.ts` | Configuracion Vite (bundler) |
| `tailwind.config.ts` | Configuracion Tailwind CSS |
| `postcss.config.js` | Configuracion PostCSS |
| `eslint.config.js` | Reglas ESLint |
| `playwright.config.ts` | Configuracion Playwright |
| `vitest.config.ts` | Configuracion Vitest |
| `railway.toml` | Configuracion Railway deploy |
| `components.json` | Configuracion shadcn-ui |

## Path Aliases

El proyecto usa `@/` como alias para `src/`:

```typescript
// En vez de:
import { Button } from '../../../components/ui/button';

// Usa:
import { Button } from '@/components/ui/button';
```

Configurado en:
- `tsconfig.json` - Para TypeScript
- `vite.config.ts` - Para Vite

## Convencion de Nombres

| Tipo | Convencion | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `ContactList.tsx` |
| Hooks | camelCase con `use` | `useContacts.ts` |
| Servicios | camelCase con `.service` | `contact.service.ts` |
| Types | camelCase con `index.ts` | `types/index.ts` |
| Utilidades | camelCase | `formatPhone.ts` |
| Constantes | UPPER_SNAKE | `PAGE_SIZE` |

## Siguiente Paso

Continua con [Arquitectura](../02-architecture/README.md) para entender como interactuan estos componentes.
