import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { RecordingState } from "../types";

export interface UseAudioRecorderReturn {
  recordingState: RecordingState;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  isSupported: boolean;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Navegador no compatible",
        description: "Tu navegador no soporta grabación de audio",
        variant: "destructive",
      });
      return;
    }

    try {
      setRecordingState("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const preferredTypes = [
        "audio/ogg;codecs=opus",
        "audio/mpeg",
        "audio/mp4",
        "audio/aac",
        "audio/webm;codecs=opus",
        "audio/amr",
      ];

      let selectedMimeType = "audio/webm;codecs=opus";
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setRecordingState("stopped");

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error("Error starting recording:", error);

      let errorMessage = "No se pudo acceder al micrófono";
      if (error.name === "NotAllowedError") {
        errorMessage = "Permiso de micrófono denegado";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No se encontró ningún micrófono";
      }

      toast({
        title: "Error al grabar",
        description: errorMessage,
        variant: "destructive",
      });

      setRecordingState("idle");
    }
  }, [isSupported, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setRecordingState("idle");
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    chunksRef.current = [];
  }, [recordingState, audioUrl]);

  return {
    recordingState,
    recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
  };
}
