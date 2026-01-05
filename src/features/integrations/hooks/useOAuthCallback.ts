import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  processOAuthCallback,
  extractOAuthParams,
  cleanOAuthParamsFromUrl,
  type OAuthCallbackResult,
} from '../services/oauth-callback.service';

export interface UseOAuthCallbackOptions {
  /**
   * Ruta a la que redirigir después de procesar el callback
   * @default '/admin/integrations'
   */
  redirectTo?: string;

  /**
   * Si true, procesa el callback automáticamente al montar
   * @default true
   */
  autoProcess?: boolean;

  /**
   * Callback cuando el proceso es exitoso
   */
  onSuccess?: (result: OAuthCallbackResult) => void;

  /**
   * Callback cuando hay un error
   */
  onError?: (error: string) => void;
}

export interface UseOAuthCallbackReturn {
  isProcessing: boolean;
  result: OAuthCallbackResult | null;
  error: string | null;
  hasOAuthParams: boolean;
  processCallback: () => Promise<void>;
}

/**
 * Hook para manejar callbacks OAuth de forma automática y escalable
 *
 * @example
 * ```tsx
 * // Uso básico - procesa automáticamente
 * function OAuthCallbackPage() {
 *   const { isProcessing } = useOAuthCallback();
 *
 *   if (isProcessing) return <LoadingSpinner />;
 *   return null; // Se redirige automáticamente
 * }
 *
 * // Con callbacks personalizados
 * function MyPage() {
 *   const { hasOAuthParams } = useOAuthCallback({
 *     autoProcess: true,
 *     redirectTo: '/integrations',
 *     onSuccess: (result) => {
 *       console.log('Integration connected:', result.integration);
 *     },
 *     onError: (error) => {
 *       console.error('OAuth failed:', error);
 *     },
 *   });
 * }
 * ```
 */
export function useOAuthCallback(
  options: UseOAuthCallbackOptions = {}
): UseOAuthCallbackReturn {
  const {
    redirectTo = '/admin/integrations',
    autoProcess = true,
    onSuccess,
    onError,
  } = options;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OAuthCallbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay parámetros OAuth en la URL
  const hasOAuthParams = Boolean(
    searchParams.get('code') || searchParams.get('error') || searchParams.get('state')
  );

  const processCallback = async () => {
    if (!hasOAuthParams) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Extraer parámetros de la URL
      const params = extractOAuthParams();

      // Procesar el callback
      const callbackResult = await processOAuthCallback(params);

      setResult(callbackResult);

      if (callbackResult.success) {
        // Mostrar toast de éxito
        toast.success(
          `Integración ${callbackResult.integration?.integration_name} conectada exitosamente`
        );

        // Callback personalizado
        onSuccess?.(callbackResult);

        // Limpiar parámetros de la URL
        cleanOAuthParamsFromUrl();

        // Esperar un momento para que el usuario vea el toast
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 1500);
      } else {
        // Error en el callback
        const errorMessage = callbackResult.error || 'Error desconocido al procesar OAuth';
        setError(errorMessage);

        toast.error(errorMessage);

        // Callback personalizado de error
        onError?.(errorMessage);

        // Limpiar parámetros y redirigir después de mostrar el error
        setTimeout(() => {
          cleanOAuthParamsFromUrl();
          navigate(redirectTo, { replace: true });
        }, 3000);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error inesperado al procesar OAuth';
      setError(errorMessage);
      toast.error(errorMessage);
      onError?.(errorMessage);

      // Redirigir en caso de error
      setTimeout(() => {
        cleanOAuthParamsFromUrl();
        navigate(redirectTo, { replace: true });
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-procesar al montar si está habilitado
  useEffect(() => {
    if (autoProcess && hasOAuthParams && !isProcessing && !result) {
      processCallback();
    }
  }, [autoProcess, hasOAuthParams]); // No incluir processCallback para evitar loops

  return {
    isProcessing,
    result,
    error,
    hasOAuthParams,
    processCallback,
  };
}
