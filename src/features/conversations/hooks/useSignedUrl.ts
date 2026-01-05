/**
 * @fileoverview Hook for getting signed URLs for private files
 * @description Fetches temporary signed URLs from Edge Function
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignedUrlCache {
  url: string;
  expiresAt: Date;
}

const urlCache = new Map<string, SignedUrlCache>();

export function useSignedUrl(filePath: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSignedUrl = useCallback(
    async (path: string, attempt = 0) => {
      try {
        // Check cache first
        const cached = urlCache.get(path);
        if (cached && cached.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
          // Use cached URL if it has more than 5 minutes left
          setSignedUrl(cached.url);
          setProcessing(false);
          setError(null);
          return;
        }

        setLoading(true);
        setError(null);

        // Get signed URL from Edge Function
        const { data, error: invokeError } = await supabase.functions.invoke("get-signed-url", {
          body: {
            file_path: path,
            expires_in: 7200, // 2 hours
          },
        });

        if (invokeError) throw invokeError;

        // Handle processing status (202)
        if (data?.status === "processing") {
          console.log("[SignedURL] File is being processed, will retry...");
          setProcessing(true);
          setSignedUrl(null);

          // Retry after 3 seconds (max 10 attempts = 30 seconds)
          if (attempt < 10) {
            setTimeout(() => {
              fetchSignedUrl(path, attempt + 1);
            }, 3000);
          } else {
            setError("El archivo está tomando demasiado tiempo en procesarse");
            toast({
              title: "Procesamiento lento",
              description: "El archivo está tardando más de lo esperado. Intenta recargar en unos momentos.",
              variant: "default",
            });
          }
          return;
        }

        // Handle failed status
        if (data?.status === "failed") {
          console.error("[SignedURL] File processing failed:", data.error);
          setProcessing(false);
          setError(data.error || "El procesamiento del archivo falló");
          toast({
            title: "Error al procesar archivo",
            description: "No se pudo descargar el archivo de WhatsApp",
            variant: "destructive",
          });
          return;
        }

        // Handle not found status
        if (data?.status === "not_found") {
          console.warn("[SignedURL] File not found in storage");
          setProcessing(true); // Might still be processing
          setSignedUrl(null);

          // Retry a few times for not found
          if (attempt < 5) {
            setTimeout(() => {
              fetchSignedUrl(path, attempt + 1);
            }, 2000);
          } else {
            setError("Archivo no encontrado");
          }
          return;
        }

        // Success case
        if (data?.signed_url) {
          const expiresAt = new Date(data.expires_at);
          urlCache.set(path, {
            url: data.signed_url,
            expiresAt,
          });
          setSignedUrl(data.signed_url);
          setProcessing(false);
          setError(null);
        }
      } catch (error: any) {
        console.error("[SignedURL] Error fetching signed URL:", error);
        setProcessing(false);
        setError(error.message || "Error al cargar archivo");
        toast({
          title: "Error al cargar archivo",
          description: "No se pudo obtener acceso al archivo",
          variant: "destructive",
        });
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (filePath) {
      fetchSignedUrl(filePath);
    } else {
      setSignedUrl(null);
    }
  }, [filePath, fetchSignedUrl]);

  return {
    signedUrl,
    loading,
    processing,
    error,
    refresh: () => filePath && fetchSignedUrl(filePath, 0),
  };
}
