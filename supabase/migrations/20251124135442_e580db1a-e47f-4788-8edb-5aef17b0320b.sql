-- Actualizar RLS Policies de custom_fields para permitir acceso a super_admin

-- Policy para SELECT
DROP POLICY IF EXISTS "Users can view their tenant custom fields" ON custom_fields;
CREATE POLICY "Users can view their tenant custom fields"
  ON custom_fields FOR SELECT
  USING (
    tenant_id = (
      SELECT profiles.tenant_id FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id IS NOT NULL
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Policy para INSERT
DROP POLICY IF EXISTS "Users can insert their tenant custom fields" ON custom_fields;
CREATE POLICY "Users can insert their tenant custom fields"
  ON custom_fields FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT profiles.tenant_id FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id IS NOT NULL
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Policy para UPDATE
DROP POLICY IF EXISTS "Users can update their tenant custom fields" ON custom_fields;
CREATE POLICY "Users can update their tenant custom fields"
  ON custom_fields FOR UPDATE
  USING (
    tenant_id = (
      SELECT profiles.tenant_id FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id IS NOT NULL
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Policy para DELETE
DROP POLICY IF EXISTS "Users can delete their tenant custom fields" ON custom_fields;
CREATE POLICY "Users can delete their tenant custom fields"
  ON custom_fields FOR DELETE
  USING (
    tenant_id = (
      SELECT profiles.tenant_id FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id IS NOT NULL
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );