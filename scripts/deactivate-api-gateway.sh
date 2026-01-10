#!/bin/bash

# Script para desactivar el API Gateway (rollback a Supabase directo)
# Este script actualiza el archivo .env para desactivar el feature flag

echo "🔄 Desactivando API Gateway (rollback a Supabase directo)..."
echo "============================================================="
echo ""

# Verificar que existe .env
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

# Desactivar feature flag
if grep -q "VITE_USE_API_GATEWAY=" .env; then
  sed -i 's/VITE_USE_API_GATEWAY=true/VITE_USE_API_GATEWAY=false/' .env 2>/dev/null || \
  sed -i '' 's/VITE_USE_API_GATEWAY=true/VITE_USE_API_GATEWAY=false/' .env 2>/dev/null
  echo "✅ Feature flag actualizado: VITE_USE_API_GATEWAY=false"
else
  echo "⚠️  Warning: VITE_USE_API_GATEWAY no encontrado en .env"
fi

echo ""
echo "============================================================="
echo "✅ API Gateway desactivado (rollback completado)"
echo "============================================================="
echo ""
echo "⚠️  IMPORTANTE: Debes reiniciar el dev server para que los cambios tomen efecto:"
echo ""
echo "  1. Detener el server actual (Ctrl+C)"
echo "  2. Reiniciar: npm run dev"
echo ""
echo "Ahora todas las operaciones volverán a usar Supabase directamente."
echo "Para reactivar, ejecuta: ./scripts/activate-api-gateway.sh"
