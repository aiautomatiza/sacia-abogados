import { supabase } from '@/integrations/supabase/client';

export interface OAuthCallbackParams {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  error_description?: string | null;
}

export interface OAuthCallbackResult {
  success: boolean;
  integration?: {
    id: string;
    integration_name: string;
    status: string;
  };
  error?: string;
}

/**
 * Procesa los parámetros del callback OAuth del middleware
 * El middleware ya procesó el código OAuth y guardó las credenciales
 * Solo necesitamos verificar el estado y obtener la integración creada
 */
export async function processOAuthCallback(
  params: OAuthCallbackParams
): Promise<OAuthCallbackResult> {
  // Si hay error en los parámetros
  if (params.error) {
    return {
      success: false,
      error: params.error_description || params.error || 'Error desconocido en OAuth',
    };
  }

  // El estado (state) contiene el tenant_id firmado
  if (!params.state) {
    return {
      success: false,
      error: 'Estado de OAuth inválido o faltante',
    };
  }

  try {
    // El middleware ya procesó todo y guardó en la base de datos
    // Solo necesitamos verificar que el usuario tenga acceso
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      };
    }

    // Obtener el perfil del usuario para verificar tenant
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Perfil de usuario no encontrado',
      };
    }

    // Buscar la integración más reciente para este tenant
    // (la que acaba de ser creada por el callback del middleware)
    const { data: integration, error: integrationError } = await supabase
      .from('integration_credentials')
      .select('id, integration_name, status')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integrationError) {
      return {
        success: false,
        error: 'Error al verificar la integración',
      };
    }

    if (!integration) {
      return {
        success: false,
        error: 'No se encontró la integración. El callback puede haber fallado.',
      };
    }

    // Verificar que la integración esté activa
    if (integration.status === 'error') {
      return {
        success: false,
        error: 'La integración se creó pero tiene errores. Intenta reconectar.',
      };
    }

    return {
      success: true,
      integration: {
        id: integration.id,
        integration_name: integration.integration_name,
        status: integration.status,
      },
    };
  } catch (error: any) {
    console.error('[processOAuthCallback] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar callback de OAuth',
    };
  }
}

/**
 * Extrae los parámetros del callback OAuth de la URL actual
 */
export function extractOAuthParams(): OAuthCallbackParams {
  const params = new URLSearchParams(window.location.search);

  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
    error_description: params.get('error_description'),
  };
}

/**
 * Limpia los parámetros OAuth de la URL sin recargar la página
 */
export function cleanOAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');

  window.history.replaceState({}, '', url.toString());
}
