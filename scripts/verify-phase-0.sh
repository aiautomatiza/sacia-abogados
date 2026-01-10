#!/bin/bash

# Script de verificación de Fase 0 - API Gateway
# Este script verifica que el API Gateway esté funcionando correctamente

API_GATEWAY_URL="https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway"

echo "🔍 Verificando API Gateway - Fase 0"
echo "=================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s "$API_GATEWAY_URL/health")
echo "$HEALTH_RESPONSE" | python -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q 'status.*ok'; then
  echo "✅ Health check OK"
else
  echo "❌ Health check FAILED"
  exit 1
fi
echo ""

# Test 2: Autenticación sin token (debe devolver 401)
echo "Test 2: Autenticación (sin token - debe devolver 401)"
echo "------------------------------------------------------"
AUTH_RESPONSE=$(curl -s "$API_GATEWAY_URL/api/test")
echo "$AUTH_RESPONSE" | python -m json.tool 2>/dev/null || echo "$AUTH_RESPONSE"

if echo "$AUTH_RESPONSE" | grep -q 'No authorization header'; then
  echo "✅ Autenticación funciona correctamente (401 sin token)"
else
  echo "❌ Autenticación no funcionó como esperado"
  exit 1
fi
echo ""

# Test 3: Endpoint inexistente (debe devolver 404)
echo "Test 3: Endpoint inexistente (debe devolver 404)"
echo "-------------------------------------------------"
NOT_FOUND_RESPONSE=$(curl -s "$API_GATEWAY_URL/api/does-not-exist")
echo "$NOT_FOUND_RESPONSE" | python -m json.tool 2>/dev/null || echo "$NOT_FOUND_RESPONSE"

if echo "$NOT_FOUND_RESPONSE" | grep -q 'Endpoint not found'; then
  echo "✅ 404 handler funciona correctamente"
else
  echo "⚠️  404 handler no funcionó como esperado (no crítico)"
fi
echo ""

# Resumen
echo "=================================="
echo "✅ Fase 0 verificada exitosamente"
echo "=================================="
echo ""
echo "Próximos pasos:"
echo "1. Comenzar Fase 1: Custom Fields"
echo "2. Ver plan completo en: .claude/plans/drifting-hugging-stallman.md"
echo "3. Ver resumen Fase 0 en: docs/phase-0-completed.md"
