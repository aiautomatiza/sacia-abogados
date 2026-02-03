# Setup Local

Guia paso a paso para configurar el entorno de desarrollo local.

## Requisitos

| Herramienta | Version | Comando para verificar |
|-------------|---------|----------------------|
| Node.js | >= 18.x | `node --version` |
| npm | >= 9.x | `npm --version` |
| Git | >= 2.x | `git --version` |

### Herramientas Recomendadas

- **VS Code** con extensiones:
  - ESLint
  - Tailwind CSS IntelliSense
  - TypeScript Importer
  - Prettier

## Paso 1: Clonar el Repositorio

```bash
git clone <repo-url>
cd dashboard-consultoria-abogados
```

## Paso 2: Instalar Dependencias

```bash
npm install
```

Esto instalara todas las dependencias definidas en `package.json`:

**Principales:**
- React 18.3
- TypeScript 5.8
- Vite 5.4
- @tanstack/react-query 5.83
- @supabase/supabase-js 2.81
- Tailwind CSS 3.4

## Paso 3: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=your-project-id
```

Ver [Variables de Entorno](./environment-variables.md) para detalle de cada variable.

## Paso 4: Obtener Credenciales de Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto (o usa uno existente)
2. En el dashboard de tu proyecto:
   - **Settings** > **API**
   - Copia **Project URL** -> `VITE_SUPABASE_URL`
   - Copia **anon/public key** -> `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Settings** > **General** -> `VITE_SUPABASE_PROJECT_ID`

## Paso 5: Iniciar Servidor de Desarrollo

```bash
npm run dev
```

El servidor se iniciara en `http://localhost:8080`.

### Verificar que funciona

1. Abre `http://localhost:8080` en el navegador
2. Deberias ver la pagina de login
3. Verifica en la consola del navegador que no hay errores de Supabase

## Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor en http://localhost:8080

# Build
npm run build            # Build de produccion
npm run build:dev        # Build de desarrollo (sin minificar)

# Verificacion
npm run lint             # Ejecutar ESLint
npm run type-check       # Verificar tipos TypeScript
npm run preview          # Preview del build de produccion

# Testing
npm run test             # Tests con Vitest
npm run test:ui          # Vitest con UI
npm run test:run         # Tests sin watch mode
npm run test:coverage    # Tests con coverage
npm run test:e2e         # Tests E2E con Playwright
npm run test:e2e:ui      # Playwright con UI
```

## Estructura del Proyecto

Despues de clonar, veras esta estructura:

```
dashboard-consultoria-abogados/
├── src/                    # Codigo fuente
│   ├── components/         # Componentes compartidos
│   ├── features/           # Modulos por feature
│   ├── hooks/              # Hooks globales
│   ├── contexts/           # React Contexts
│   ├── integrations/       # Cliente Supabase + tipos
│   ├── lib/                # Utilidades
│   └── pages/              # Componentes de pagina
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Migraciones SQL
├── public/                 # Assets estaticos
└── docs/                   # Documentacion
```

Ver [Estructura del Proyecto](./project-structure.md) para mas detalle.

## Configuracion de VS Code

Archivo `.vscode/settings.json` recomendado:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Problemas Comunes

### Error: "Cannot find module '@/...'"

El proyecto usa path aliases. Verifica que `tsconfig.json` tiene:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error de conexion a Supabase

1. Verifica que las variables en `.env` son correctas
2. Asegurate de que el proyecto de Supabase esta activo
3. Revisa que la URL no tiene slash al final

### Puerto 8080 en uso

El servidor usa puerto 8080 por defecto. Si esta ocupado:

```bash
# En vite.config.ts, cambia el puerto
server: {
  port: 3000, // o cualquier otro puerto libre
}
```

### npm install falla

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Siguiente Paso

Lee [Variables de Entorno](./environment-variables.md) para entender todas las configuraciones disponibles.
