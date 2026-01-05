/**
 * @fileoverview Audio Recorder Component - ADAPTADO PARA TENANT-BASED
 * @description UI for recording, previewing and sending audio messages
 *
 * CAMBIOS vs original:
 * - Ninguno (componente cliente sin referencias a backend específico)
 */

import { Button } from "@/components/ui/button";
import { Mic, Square, X, Send, Loader2 } from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useAudioConverter } from "../hooks/useAudioConverter";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onAudioReady: (audioFile: File) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioReady, disabled }: Props) {
  const {
    recordingState,
    recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
  } = useAudioRecorder();

  const { convertToMp3, isConverting, isLoading } = useAudioConverter();
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;

    try {
      console.log("[AudioRecorder] Original audio format:", audioBlob.type);
      console.log("[AudioRecorder] Original audio size:", audioBlob.size, "bytes");
      console.log("[AudioRecorder] Converting to MP3 mono...");

      // ALWAYS convert to MP3 mono (universal compatibility)
      const mp3Blob = await convertToMp3(audioBlob);

      console.log("[AudioRecorder] Final MIME type: audio/mpeg");
      console.log("[AudioRecorder] Final audio size:", mp3Blob.size, "bytes");

      const audioFile = new File([mp3Blob], `audio-${Date.now()}.mp3`, { type: "audio/mpeg" });

      console.log("[AudioRecorder] Audio file ready:", {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size,
      });

      onAudioReady(audioFile);
      cancelRecording();
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Error al procesar el audio",
        description: error instanceof Error ? error.message : "Por favor, intenta de nuevo",
        variant: "destructive",
      });
    }
  };

  if (!isSupported) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled
        title="Grabación de audio no disponible en este navegador"
      >
        <Mic className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  // Preview mode (after recording stopped)
  if (recordingState === "stopped" && audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md animate-in fade-in duration-200">
        <audio src={audioUrl} controls className="h-8" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(recordingTime)}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={cancelRecording}
          className="h-8 w-8 shrink-0"
          disabled={isConverting}
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={handleSendAudio}
          className="h-8 w-8 shrink-0"
          disabled={isConverting || isLoading}
          title={isConverting ? "Procesando audio..." : "Enviar audio"}
        >
          {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  // Recording mode
  if (recordingState === "recording") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={stopRecording}
          className="relative animate-pulse"
          title="Detener grabación"
        >
          <Square className="h-5 w-5 fill-current" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </Button>
        <span className="text-sm font-mono text-destructive">{formatTime(recordingTime)}</span>
      </div>
    );
  }

  // Idle/Requesting mode
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled || recordingState === "requesting"}
      title="Grabar audio"
    >
      {recordingState === "requesting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}
