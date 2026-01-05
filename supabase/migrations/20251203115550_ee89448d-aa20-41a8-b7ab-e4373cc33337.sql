-- Permitir a usuarios ver su propio tenant (necesario para v_crm_calls_detailed)
CREATE POLICY "Users can view their own tenant"
ON tenants FOR SELECT
USING (id = get_user_tenant_id(auth.uid()));

-- Permitir a usuarios ver perfiles del mismo tenant (para ver agent_email)
CREATE POLICY "Users can view profiles from same tenant"
ON profiles FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));