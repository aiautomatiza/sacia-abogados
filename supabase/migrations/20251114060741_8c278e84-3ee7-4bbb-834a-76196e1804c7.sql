-- FASE 1: Sistema de Roles y Multi-Tenancy

-- 1.1 Crear enum de roles
CREATE TYPE public.app_role AS ENUM ('user_client', 'super_admin');

-- 1.2 Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Función para verificar roles (SECURITY DEFINER - evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 1.4 Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 1.5 Crear tabla de clientes (tenants)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage tenants"
ON public.tenants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER handle_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 1.6 MIGRAR DATOS PRIMERO - Crear tenants para usuarios existentes
INSERT INTO public.tenants (id, name, email, status)
SELECT DISTINCT 
    p.tenant_id,
    'Cliente ' || LEFT(p.tenant_id::TEXT, 8),
    p.email,
    'active'
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 1.7 AHORA agregar constraint a profiles para vincular con tenants
ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_tenant_id_fkey 
    FOREIGN KEY (tenant_id) 
    REFERENCES public.tenants(id) 
    ON DELETE CASCADE;

-- 1.8 Crear tabla de configuración de clientes
CREATE TABLE public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Canales habilitados
    whatsapp_enabled BOOLEAN DEFAULT false,
    calls_enabled BOOLEAN DEFAULT false,
    
    -- Webhooks
    whatsapp_webhook_url TEXT,
    calls_webhook_url TEXT,
    
    -- Configuración adicional
    calls_phone_number TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage tenant settings"
ON public.tenant_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their tenant settings"
ON public.tenant_settings FOR SELECT
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid()
    )
);

CREATE TRIGGER handle_tenant_settings_updated_at
    BEFORE UPDATE ON public.tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 1.9 Crear tabla de credenciales secretas
CREATE TABLE public.tenant_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    
    -- Referencias a secretos (NO los valores reales)
    whatsapp_secret_name TEXT,
    calls_secret_name TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage tenant credentials"
ON public.tenant_credentials FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 1.10 Modificar función handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear profile, sin tenant (será asignado por superAdmin)
  INSERT INTO public.profiles (id, email, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    NULL  -- Sin tenant al inicio
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- 1.11 Continuar migración de datos
-- Asignar rol user_client a usuarios existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user_client'::app_role
FROM auth.users
ON CONFLICT DO NOTHING;

-- Crear settings por defecto para tenants existentes
INSERT INTO public.tenant_settings (tenant_id, whatsapp_enabled, calls_enabled)
SELECT DISTINCT tenant_id, true, true
FROM public.profiles
WHERE tenant_id IS NOT NULL;

-- Migrar webhooks existentes a tenant_settings
UPDATE public.tenant_settings ts
SET 
    whatsapp_webhook_url = (
        SELECT webhook 
        FROM public.webhooks 
        WHERE tenant_id = ts.tenant_id AND channel = 'whatsapp'
        LIMIT 1
    ),
    calls_webhook_url = (
        SELECT webhook 
        FROM public.webhooks 
        WHERE tenant_id = ts.tenant_id AND channel = 'llamadas'
        LIMIT 1
    );

-- 1.12 Actualizar políticas RLS existentes
-- Políticas para crm_contacts
DROP POLICY IF EXISTS "Users can view their tenant contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can insert their tenant contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can update their tenant contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can delete their tenant contacts" ON public.crm_contacts;

CREATE POLICY "Users can view their tenant contacts"
ON public.crm_contacts FOR SELECT
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

CREATE POLICY "Users can insert their tenant contacts"
ON public.crm_contacts FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

CREATE POLICY "Users can update their tenant contacts"
ON public.crm_contacts FOR UPDATE
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

CREATE POLICY "Users can delete their tenant contacts"
ON public.crm_contacts FOR DELETE
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

-- Políticas para custom_fields
DROP POLICY IF EXISTS "Users can view their tenant custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can insert their tenant custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can update their tenant custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can delete their tenant custom fields" ON public.custom_fields;

CREATE POLICY "Users can view their tenant custom fields"
ON public.custom_fields FOR SELECT
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

CREATE POLICY "Users can insert their tenant custom fields"
ON public.custom_fields FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

CREATE POLICY "Users can update their tenant custom fields"
ON public.custom_fields FOR UPDATE
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);

CREATE POLICY "Users can delete their tenant custom fields"
ON public.custom_fields FOR DELETE
TO authenticated
USING (
    tenant_id = (
        SELECT profiles.tenant_id
        FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.tenant_id IS NOT NULL
    )
);