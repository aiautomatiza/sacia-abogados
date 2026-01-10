#!/bin/bash

# Script para testear los endpoints de Contacts en el API Gateway
# Necesitas un JWT token válido de tu sesión de Supabase

echo "🧪 Testing Contacts API Endpoints"
echo "=================================="
echo ""

# Verificar que existe el token
if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Error: JWT_TOKEN no está configurado"
  echo ""
  echo "Para obtener tu token:"
  echo "1. Abre la aplicación en tu navegador"
  echo "2. Abre DevTools (F12)"
  echo "3. Ve a la consola y ejecuta: localStorage.getItem('sb-voolvfxtegcebfvsdijz-auth-token')"
  echo "4. Copia el access_token del objeto JSON"
  echo "5. Exporta: export JWT_TOKEN='tu-token-aqui'"
  echo ""
  exit 1
fi

API_URL="https://voolvfxtegcebfvsdijz.supabase.co/functions/v1/api-gateway/api"

echo "📋 Test 1: GET /contacts (listar contactos)"
echo "-------------------------------------------"
curl -s -X GET "$API_URL/contacts?page=1&pageSize=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "📋 Test 2: POST /contacts (crear contacto)"
echo "-------------------------------------------"
CONTACT_DATA='{
  "numero": "666123456",
  "nombre": "Test Contact API Gateway",
  "attributes": {
    "email": "test@example.com",
    "company": "Test Company"
  }
}'

RESPONSE=$(curl -s -X POST "$API_URL/contacts" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CONTACT_DATA")

echo "$RESPONSE" | python -m json.tool
CONTACT_ID=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
echo ""
echo "Contact ID creado: $CONTACT_ID"
echo ""

if [ -n "$CONTACT_ID" ]; then
  echo "📋 Test 3: GET /contacts/:id (obtener contacto)"
  echo "-----------------------------------------------"
  curl -s -X GET "$API_URL/contacts/$CONTACT_ID" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" | python -m json.tool
  echo ""
  echo ""

  echo "📋 Test 4: PATCH /contacts/:id (actualizar contacto)"
  echo "----------------------------------------------------"
  UPDATE_DATA='{
    "nombre": "Test Contact Updated",
    "attributes": {
      "email": "updated@example.com",
      "company": "Updated Company",
      "notes": "Added via API Gateway test"
    }
  }'

  curl -s -X PATCH "$API_URL/contacts/$CONTACT_ID" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_DATA" | python -m json.tool
  echo ""
  echo ""

  echo "📋 Test 5: Verificar normalización telefónica"
  echo "---------------------------------------------"
  echo "Teléfono enviado: 666123456"
  echo "Teléfono esperado: +34666123456"
  curl -s -X GET "$API_URL/contacts/$CONTACT_ID" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" | python -c "import sys, json; data=json.load(sys.stdin); print(f\"Teléfono guardado: {data.get('numero', 'N/A')}\")"
  echo ""
  echo ""

  echo "📋 Test 6: DELETE /contacts/:id (eliminar contacto)"
  echo "---------------------------------------------------"
  curl -s -X DELETE "$API_URL/contacts/$CONTACT_ID" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" | python -m json.tool
  echo ""
  echo ""
fi

echo "📋 Test 7: Búsqueda de contactos"
echo "---------------------------------"
curl -s -X GET "$API_URL/contacts?search=test&page=1&pageSize=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool
echo ""
echo ""

echo "=================================="
echo "✅ Tests completados"
echo "=================================="
echo ""
echo "⚠️  Nota: Verifica que:"
echo "  1. El teléfono se normalizó a +34666123456"
echo "  2. Los custom fields se guardaron en 'attributes'"
echo "  3. La búsqueda funciona correctamente"
echo "  4. Las respuestas tienen el formato correcto con 'data' y 'meta'"
