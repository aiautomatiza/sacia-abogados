/**
 * @fileoverview File Preview Component - ADAPTADO PARA TENANT-BASED
 * @description Display different file types in messages
 *
 * CAMBIOS vs original:
 * - Ninguno (componente de presentación sin referencias a clinic/account)
 */

import { FileIcon, Download, Image, Video, Music, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "../hooks/useSignedUrl";

interface Props {
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number;
  caption?: string | null;
}

export function FilePreview({ fileName, fileType, fileUrl, fileSize, caption }: Props) {
  const { signedUrl, loading, processing, error, refresh } = useSignedUrl(fileUrl);

  // Prefer signed URL; only fallback to external absolute URLs (avoid relative paths that 404)
  const isExternal = /^https?:\/\//i.test(fileUrl);
  const displayUrl = signedUrl || (isExternal ? fileUrl : "");
  const isImage = fileType.startsWith("image/");
  const isVideo = fileType.startsWith("video/");
  const isAudio = fileType.startsWith("audio/");

  // Show processing state
  if (processing) {
    return (
      <div className="flex items-center gap-3 p-4 bg-accent/30 rounded-lg border border-accent/50">
        <Loader2 className="h-5 w-5 animate-spin text-accent-foreground" />
        <div>
          <p className="text-sm font-medium text-accent-foreground">Descargando archivo...</p>
          <p className="text-xs text-muted-foreground">El archivo de WhatsApp se está procesando</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
        <FileIcon className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Error al cargar archivo</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-background/50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  // If we still don't have a playable URL, show a helpful action
  if (!displayUrl) {
    return (
      <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border max-w-sm">
        <Loader2 className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Generando acceso seguro...</p>
          <p className="text-xs text-muted-foreground">Si tarda demasiado, reintenta.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={refresh}>
          Reintentar
        </Button>
      </div>
    );
  }

  const getIcon = () => {
    if (isImage) return <Image className="h-5 w-5" />;
    if (isVideo) return <Video className="h-5 w-5" />;
    if (isAudio) return <Music className="h-5 w-5" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  if (isImage) {
    return (
      <div className="space-y-2">
        <a href={displayUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={displayUrl}
            alt={fileName}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
        {caption && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">{caption}</p>}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="space-y-2">
        <video controls playsInline preload="metadata" crossOrigin="anonymous" className="max-w-sm rounded-lg bg-muted">
          <source src={displayUrl} />
          Tu navegador no soporta el elemento de video.
        </video>
        {caption && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg max-w-sm">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          {fileSize && <p className="text-xs opacity-70">{(fileSize / 1024).toFixed(0)} KB</p>}
        </div>
        <Button size="icon" variant="ghost" asChild className="shrink-0" disabled={!displayUrl}>
          <a href={displayUrl} download={fileName} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>
      {caption && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">{caption}</p>}
    </div>
  );
}
