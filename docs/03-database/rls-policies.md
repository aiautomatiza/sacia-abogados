# RLS Policies

Politicas de Row Level Security para aislamiento multi-tenant.

## Concepto

Row Level Security (RLS) es el mecanismo de PostgreSQL que garantiza que cada usuario solo pueda ver y modificar datos de su tenant.

```sql
-- Habilitar RLS en una tabla
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

-- Crear politica
CREATE POLICY "Users can only see their tenant contacts"
ON crm_contacts
FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

## Funciones Helper

### is_super_admin

```sql
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### get_user_tenant_id

```sql
CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### has_role

```sql
CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

## Patron Estandar

### Tabla con tenant_id

```sql
-- SELECT
CREATE POLICY "tenant_select_policy" ON table_name
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

-- INSERT
CREATE POLICY "tenant_insert_policy" ON table_name
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
);

-- UPDATE
CREATE POLICY "tenant_update_policy" ON table_name
FOR UPDATE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);

-- DELETE
CREATE POLICY "tenant_delete_policy" ON table_name
FOR DELETE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);
```

## Policies por Tabla

### tenants

```sql
-- Solo super_admin puede ver tenants
CREATE POLICY "super_admin_select" ON tenants
FOR SELECT USING (is_super_admin(auth.uid()));

-- Solo super_admin puede crear tenants
CREATE POLICY "super_admin_insert" ON tenants
FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- Solo super_admin puede modificar tenants
CREATE POLICY "super_admin_update" ON tenants
FOR UPDATE USING (is_super_admin(auth.uid()));
```

### profiles

```sql
-- Usuario ve su propio perfil o perfiles de su tenant
CREATE POLICY "users_see_own_and_tenant_profiles" ON profiles
FOR SELECT USING (
  id = auth.uid()
  OR tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

-- Usuario puede actualizar solo su perfil
CREATE POLICY "users_update_own_profile" ON profiles
FOR UPDATE USING (id = auth.uid());
```

### user_roles

```sql
-- Usuario ve su propio rol
CREATE POLICY "users_see_own_role" ON user_roles
FOR SELECT USING (
  user_id = auth.uid()
  OR is_super_admin(auth.uid())
);

-- Solo super_admin puede asignar roles
CREATE POLICY "super_admin_manage_roles" ON user_roles
FOR ALL USING (is_super_admin(auth.uid()));
```

### crm_contacts

```sql
CREATE POLICY "tenant_contacts_select" ON crm_contacts
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_contacts_insert" ON crm_contacts
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "tenant_contacts_update" ON crm_contacts
FOR UPDATE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "tenant_contacts_delete" ON crm_contacts
FOR DELETE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);
```

### conversations

```sql
CREATE POLICY "tenant_conversations_select" ON conversations
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_conversations_insert" ON conversations
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "tenant_conversations_update" ON conversations
FOR UPDATE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);
```

### conversation_messages

```sql
-- Mensajes via conversation (no tiene tenant_id directo)
CREATE POLICY "messages_via_conversation" ON conversation_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.tenant_id = get_user_tenant_id(auth.uid())
         OR is_super_admin(auth.uid()))
  )
);

CREATE POLICY "messages_insert_via_conversation" ON conversation_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND c.tenant_id = get_user_tenant_id(auth.uid())
  )
);
```

### crm_calls

```sql
CREATE POLICY "tenant_calls_select" ON crm_calls
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_calls_insert" ON crm_calls
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "tenant_calls_update" ON crm_calls
FOR UPDATE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);
```

### campaigns

```sql
CREATE POLICY "tenant_campaigns_all" ON campaigns
FOR ALL USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);
```

### appointments

```sql
CREATE POLICY "tenant_appointments_select" ON appointments
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_appointments_insert" ON appointments
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "tenant_appointments_update" ON appointments
FOR UPDATE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "tenant_appointments_delete" ON appointments
FOR DELETE USING (
  tenant_id = get_user_tenant_id(auth.uid())
);
```

### tenant_settings

```sql
-- 1:1 con tenant
CREATE POLICY "tenant_settings_select" ON tenant_settings
FOR SELECT USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "tenant_settings_update" ON tenant_settings
FOR UPDATE USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);
```

## Service Role Bypass

Las Edge Functions usan `service_role` key que bypasea RLS:

```typescript
// En Edge Function
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Bypasea RLS
);

// Puede ver todos los datos
const { data } = await supabase.from('crm_contacts').select('*');
```

**IMPORTANTE:** Solo usar service_role en backend (Edge Functions).

## Verificar RLS

### Listar policies de una tabla

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'crm_contacts';
```

### Verificar RLS habilitado

```sql
SELECT
  relname,
  relrowsecurity,
  relforcerowsecurity
FROM pg_class
WHERE relname = 'crm_contacts';
```

## Testing RLS

```sql
-- Simular usuario especifico
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Ejecutar query (deberia filtrar por tenant)
SELECT * FROM crm_contacts;

-- Resetear
RESET ROLE;
```

## Troubleshooting

### Query retorna vacio

1. Verificar que RLS esta habilitado
2. Verificar que el usuario tiene policy
3. Verificar tenant_id del usuario

### Error "new row violates row-level security policy"

El INSERT no cumple WITH CHECK:
1. Verificar que tenant_id es correcto
2. Verificar que el usuario tiene permiso

### Policy no aplica

1. Verificar que la tabla tiene RLS habilitado
2. Verificar que la policy esta activa
3. Verificar que el rol esta incluido

## Siguiente Paso

Continua con [Functions & Triggers](./functions-triggers.md) para ver funciones SQL.
