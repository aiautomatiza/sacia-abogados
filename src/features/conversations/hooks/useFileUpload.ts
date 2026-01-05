import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FileUploadResult } from "../types";

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<FileUploadResult | null> => {
    try {
      setUploading(true);

      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast({
          title: "Archivo demasiado grande",
          description: "El tamaño máximo es 50 MB",
          variant: "destructive",
        });
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const uuid = crypto.randomUUID();
      const fileName = `${uuid}.${fileExt}`;

      const normalizedContentType = (file.type || "application/octet-stream").split(";")[0].trim();

      console.log("[FileUpload] Uploading file:", {
        name: fileName,
        size: file.size,
        originalType: file.type,
        normalizedType: normalizedContentType,
      });

      const { error: uploadError } = await supabase.storage
        .from("conversation-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: normalizedContentType,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("conversation-attachments")
        .getPublicUrl(fileName);

      return {
        file_url: publicUrlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      };
    } catch (error: any) {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
  };
}
