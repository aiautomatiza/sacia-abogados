import { useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useOAuthCallback } from '@/features/integrations/hooks/useOAuthCallback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Página dedicada para manejar callbacks OAuth
 * Se monta cuando el middleware redirige al usuario de vuelta después de autorizar
 *
 * Flow:
 * 1. Usuario hace clic en "Conectar" en IntegrationCard
 * 2. Se inicia OAuth (initiate-oauth function)
 * 3. Usuario autoriza en el provider externo
 * 4. Provider redirige al middleware con código
 * 5. Middleware procesa y guarda credenciales (handle-oauth-callback function)
 * 6. Middleware redirige aquí: /oauth/callback?state=xxx
 * 7. Esta página verifica el estado y muestra feedback
 * 8. Redirige a /admin/integrations
 */
export default function OAuthCallback() {
  const { isProcessing, result, error, hasOAuthParams } = useOAuthCallback({
    redirectTo: '/admin/integrations',
    autoProcess: true,
  });

  // Si no hay parámetros OAuth, redirigir inmediatamente
  useEffect(() => {
    if (!hasOAuthParams && !isProcessing) {
      window.location.href = '/admin/integrations';
    }
  }, [hasOAuthParams, isProcessing]);

  // Estado: Procesando
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle className="text-center">Procesando conexión...</CardTitle>
            <CardDescription className="text-center">
              Estamos verificando tu autorización y configurando la integración
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Estado: Error
  if (error || (result && !result.success)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center text-destructive">
              Error al conectar integración
            </CardTitle>
            <CardDescription className="text-center">
              {error || result?.error || 'Ocurrió un error inesperado'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">
              Serás redirigido a la página de integraciones en unos momentos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado: Éxito
  if (result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md border-green-500">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-center text-green-600">
              ¡Integración conectada!
            </CardTitle>
            <CardDescription className="text-center">
              {result.integration?.integration_name
                ? `Tu integración con ${result.integration.integration_name} se configuró correctamente`
                : 'Tu integración se configuró correctamente'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">
              Redirigiendo a la página de integraciones...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado: Sin parámetros (no debería llegar aquí por el useEffect)
  return null;
}
