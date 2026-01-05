import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user is superAdmin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'No autorizado - requiere rol superAdmin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, tenant_data } = await req.json();

    console.log('manage-tenants:', { action, user_id: user.id });

    switch (action) {
      case 'list': {
        // List all tenants with user count
        const { data: tenants, error } = await adminClient
          .from('tenants')
          .select(`
            *,
            tenant_settings(*),
            profiles!profiles_tenant_id_fkey(count)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify(tenants),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        // Create new tenant
        const { data: newTenant, error: tenantError } = await adminClient
          .from('tenants')
          .insert(tenant_data)
          .select()
          .single();

        if (tenantError) throw tenantError;

        // Create default settings
        const { error: settingsError } = await adminClient
          .from('tenant_settings')
          .insert({
            tenant_id: newTenant.id,
            whatsapp_enabled: false,
            calls_enabled: false
          });

        if (settingsError) throw settingsError;

        console.log('Tenant created:', newTenant.id);

        return new Response(
          JSON.stringify(newTenant),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        // Delete tenant (CASCADE will delete everything)
        const { error } = await adminClient
          .from('tenants')
          .delete()
          .eq('id', tenant_data.id);

        if (error) throw error;

        console.log('Tenant deleted:', tenant_data.id);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_user': {
        // Assign user to tenant
        const { user_id, tenant_id } = tenant_data;

        const { error } = await adminClient
          .from('profiles')
          .update({ tenant_id })
          .eq('id', user_id);

        if (error) throw error;

        console.log('User assigned to tenant:', { user_id, tenant_id });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Acción no válida');
    }
  } catch (error: any) {
    console.error('Error in manage-tenants:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
