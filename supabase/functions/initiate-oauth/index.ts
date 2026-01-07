import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_name, tenant_id } = await req.json();

    if (!integration_name || !tenant_id) {
      throw new Error('Missing required parameters: integration_name and tenant_id');
    }

    // Validar que el usuario tiene permisos
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid or missing authentication token');
    }

    // Verificar que el tenant_id coincide con el usuario
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (profile.tenant_id !== tenant_id) {
      throw new Error('Tenant mismatch: User does not belong to this tenant');
    }

    // Llamar al middleware para iniciar OAuth
    const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');
    if (!middlewareUrl) {
      throw new Error('MIDDLEWARE_URL environment variable is not configured');
    }

    const dashboardUrl = Deno.env.get('DASHBOARD_URL') || 'http://localhost:8080';

    console.log(`[initiate-oauth] Calling middleware for integration: ${integration_name}, tenant: ${tenant_id}`);
    console.log(`[initiate-oauth] User ID: ${user.id}, Email: ${user.email}`);

    // Debug: Log token info (first/last 10 chars only for security)
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    console.log(`[initiate-oauth] Token (first 20 chars): ${token.substring(0, 20)}...`);

    // Construir URL con query parameters
    const params = new URLSearchParams({
      integration_name: integration_name,
      tenant_id: tenant_id,
      redirect_url: `${dashboardUrl}/oauth/callback`,
    });

    const middlewareRequestUrl = `${middlewareUrl}/api/oauth/authorize?${params.toString()}`;
    console.log(`[initiate-oauth] Requesting: ${middlewareRequestUrl}`);

    const response = await fetch(middlewareRequestUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[initiate-oauth] Middleware error: ${response.status} - ${errorText}`);
      throw new Error(`Middleware error: ${response.statusText}`);
    }

    const { authorization_url, state } = await response.json();

    if (!authorization_url) {
      throw new Error('Middleware did not return authorization URL');
    }

    console.log(`[initiate-oauth] OAuth initiated successfully for ${integration_name}`);

    return new Response(
      JSON.stringify({ authorization_url, state }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[initiate-oauth] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to initiate OAuth flow',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
