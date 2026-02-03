# Railway Deployment

Guia para desplegar el frontend en Railway.

## Requisitos

- Cuenta en [Railway](https://railway.app)
- Repositorio en GitHub
- Variables de entorno de Supabase

## Configuracion del Proyecto

### railway.toml

El proyecto ya incluye configuracion para Railway:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### package.json scripts

```json
{
  "scripts": {
    "build": "vite build",
    "start": "serve dist -s -l $PORT"
  }
}
```

El comando `serve dist -s` sirve archivos estaticos con:
- `-s` - SPA mode (redirige todas las rutas a index.html)
- `-l $PORT` - Usa el puerto asignado por Railway

## Pasos de Deployment

### 1. Crear Proyecto en Railway

1. Ir a [railway.app](https://railway.app)
2. Click "New Project"
3. Seleccionar "Deploy from GitHub repo"
4. Autorizar acceso a tu repositorio
5. Seleccionar el repositorio

### 2. Configurar Variables de Entorno

En Railway Dashboard:

1. Click en el servicio
2. Tab "Variables"
3. Agregar:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx
```

**Opcional (si usas middleware):**
```
VITE_MIDDLEWARE_URL=https://middleware.railway.app
```

### 3. Deploy

Railway desplegara automaticamente cuando:
- Configures las variables
- Hagas push a la rama principal

El proceso:
1. Clona el repositorio
2. Ejecuta `npm install`
3. Ejecuta `npm run build`
4. Inicia con `npm start`

### 4. Verificar Deploy

1. Click en "Deployments" para ver logs
2. Una vez completado, click en el dominio generado
3. Verificar que la aplicacion carga

## Dominio Personalizado

### Agregar dominio

1. En Railway, click en "Settings"
2. Section "Domains"
3. Click "Add Domain"
4. Ingresar tu dominio (ej: `app.tudominio.com`)

### Configurar DNS

Agregar registro CNAME en tu proveedor DNS:

```
Tipo: CNAME
Nombre: app
Valor: xxx.railway.app
```

Railway generara certificado SSL automaticamente.

## Variables de Build vs Runtime

### Build time (VITE_*)

Las variables `VITE_*` se incorporan durante el build:

```javascript
// Disponible en el codigo
const url = import.meta.env.VITE_SUPABASE_URL;
```

**IMPORTANTE:** Cambiar variables `VITE_*` requiere rebuild.

### Runtime

Variables como `PORT` se usan en runtime por el servidor.

## Troubleshooting

### Build falla

```
Error: Cannot find module...
```

**Solucion:**
- Verificar que `package.json` tiene todas las dependencias
- Limpiar cache: Settings > Clear Build Cache

### App no carga

```
404 Not Found
```

**Solucion:**
- Verificar que `serve` esta instalado
- Verificar `npm start` usa `-s` para SPA mode

### Variables undefined

```
VITE_SUPABASE_URL is undefined
```

**Solucion:**
- Verificar nombre exacto de variable (case sensitive)
- Redeploy despues de agregar variables

### CORS errors

```
Access-Control-Allow-Origin
```

**Solucion:**
- Verificar URLs correctas en Supabase
- Verificar dominio en Supabase Auth settings

## Monitoreo

### Logs

1. Click en "Deployments"
2. Click en un deploy
3. Ver "Build Logs" y "Deploy Logs"

### Metricas

Railway muestra:
- CPU usage
- Memory usage
- Network

## Costos

Railway tiene tier gratuito con:
- 500 horas de ejecucion/mes
- 100GB de bandwidth

Para produccion, considerar plan Pro.

## Alternativas

Si Railway no es adecuado:

| Plataforma | Ventaja |
|------------|---------|
| Vercel | Mejor para Next.js/Vite |
| Netlify | Simple para static sites |
| Cloudflare Pages | CDN global |

Estas plataformas tienen mejor soporte para SPAs.

## Checklist

- [ ] Repositorio conectado
- [ ] Variables de entorno configuradas
- [ ] Build exitoso
- [ ] App carga correctamente
- [ ] Login funciona
- [ ] Datos se cargan de Supabase
- [ ] Dominio personalizado (opcional)
