# Getting Started

Esta seccion te guiara para configurar el proyecto y empezar a desarrollar.

## Contenido

1. [Setup Local](./setup-local.md) - Instalacion y configuracion del entorno
2. [Variables de Entorno](./environment-variables.md) - Configuracion de .env
3. [Estructura del Proyecto](./project-structure.md) - Tour por las carpetas

## Requisitos Previos

- **Node.js** 18.x o superior
- **npm** 9.x o superior
- **Git**
- **Editor de codigo** (VS Code recomendado)
- Cuenta en **Supabase** (gratuita disponible)

## Inicio Rapido

```bash
# Clonar repositorio
git clone <repo-url>
cd dashboard-consultoria-abogados

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Configurar variables (ver environment-variables.md)

# Iniciar servidor de desarrollo
npm run dev
```

El servidor estara disponible en `http://localhost:8080`.

## Siguiente Paso

Continua con [Setup Local](./setup-local.md) para instrucciones detalladas.
