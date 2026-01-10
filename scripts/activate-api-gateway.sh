#!/bin/bash

# Script para activar el API Gateway (Fase 1+)
# Este script actualiza el archivo .env para activar el feature flag

echo "🚀 Activando API Gateway..."
echo "=============================="
echo ""

# Verificar que existe .env
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found"
  echo "Por favor, copia .env.example a .env primero"
  exit 1
fi

# Backup del .env actual
cp .env .env.backup
echo "✅ Backup creado: .env.backup"

# Activar feature flag
if grep -q "VITE_USE_API_GATEWAY=" .env; then
  # El flag existe, actualizarlo
  sed -i 's/VITE_USE_API_GATEWAY=false/VITE_USE_API_GATEWAY=true/' .env 2>/dev/null || \
  sed -i '' 's/VITE_USE_API_GATEWAY=false/VITE_USE_API_GATEWAY=true/' .env 2>/dev/null
  echo "✅ Feature flag actualizado: VITE_USE_API_GATEWAY=true"
else
  # El flag no existe, agregarlo
  echo "" >> .env
  echo "# API Gateway activo" >> .env
  echo "VITE_USE_API_GATEWAY=true" >> .env
  echo "✅ Feature flag agregado: VITE_USE_API_GATEWAY=true"
fi

echo ""
echo "=============================="
echo "✅ API Gateway activado"
echo "=============================="
echo ""
echo "⚠️  IMPORTANTE: Debes reiniciar el dev server para que los cambios tomen efecto:"
echo ""
echo "  1. Detener el server actual (Ctrl+C)"
echo "  2. Reiniciar: npm run dev"
echo ""
echo "Ahora todas las operaciones de Custom Fields pasarán por el API Gateway."
echo "Para desactivar, ejecuta: ./scripts/deactivate-api-gateway.sh"
echo ""
echo "Pruebas a realizar:"
echo "  - Abrir configuración de Custom Fields en Contactos"
echo "  - Crear/editar/eliminar campos personalizados"
echo "  - Verificar en Network tab que requests van a /api-gateway/api/custom-fields"
