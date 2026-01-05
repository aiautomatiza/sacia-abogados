/**
 * @fileoverview Audio Converter Hook using FFmpeg.wasm
 * @description Converts WebM audio to OGG/Opus format for WhatsApp compatibility
 */

import { useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface UseAudioConverterReturn {
  convertToMp3: (audioBlob: Blob) => Promise<Blob>;
  isConverting: boolean;
  isLoading: boolean;
}

export function useAudioConverter(): UseAudioConverterReturn {
  const [isConverting, setIsConverting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);

  const loadFFmpeg = async () => {
    if (loadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current;
    }

    setIsLoading(true);
    try {
      const ffmpeg = new FFmpeg();

      // Use CDN with correct paths (esm single-thread build)
      const sources = [
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm",
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm",
      ];

      let lastError: Error | null = null;

      for (const baseURL of sources) {
        try {
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
          });

          ffmpegRef.current = ffmpeg;
          loadedRef.current = true;
          console.log(`FFmpeg loaded successfully from: ${baseURL}`);
          return ffmpeg;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Failed to load FFmpeg from ${baseURL}:`, error);
        }
      }

      throw lastError || new Error("No se pudo cargar el convertidor de audio");
    } catch (error) {
      console.error("Error loading FFmpeg:", error);
      throw new Error("No se pudo cargar el convertidor de audio");
    } finally {
      setIsLoading(false);
    }
  };

  const convertToMp3 = async (inputBlob: Blob): Promise<Blob> => {
    setIsConverting(true);

    try {
      // Load FFmpeg if not already loaded
      const ffmpeg = await loadFFmpeg();

      // Detect input format from MIME type
      const inputType = inputBlob.type.split(";")[0].trim();
      let inputExt = "webm"; // default

      if (inputType.includes("mp4")) inputExt = "mp4";
      else if (inputType.includes("mpeg")) inputExt = "mp3";
      else if (inputType.includes("aac")) inputExt = "aac";
      else if (inputType.includes("wav")) inputExt = "wav";
      else if (inputType.includes("ogg")) inputExt = "ogg";

      const inputFileName = `input.${inputExt}`;
      const outputFileName = "output.mp3";

      console.log(`[FFmpeg] Converting ${inputFileName} (${inputBlob.size} bytes) to MP3 mono...`);

      await ffmpeg.writeFile(inputFileName, await fetchFile(inputBlob));

      // Convert to MP3 mono with exact parameters specified
      await ffmpeg.exec([
        "-y",
        "-i",
        inputFileName,
        "-vn", // No video
        "-acodec",
        "libmp3lame", // MP3 LAME codec
        "-ar",
        "44100", // 44.1 kHz sample rate (CD quality)
        "-ac",
        "1", // Mono audio (1 channel)
        "-b:a",
        "128k", // 128 kbps bitrate (good quality for voice)
        outputFileName,
      ]);

      // Read output file
      const data = await ffmpeg.readFile(outputFileName);

      // Clean up virtual filesystem
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      const mp3Blob = new Blob([new Uint8Array(data as Uint8Array)], {
        type: "audio/mpeg",
      });

      console.log(`[FFmpeg] Conversion successful: ${mp3Blob.size} bytes`);

      return mp3Blob;
    } catch (error) {
      console.error("Error converting audio:", error);
      throw new Error("Error al convertir el audio. Por favor, intenta de nuevo.");
    } finally {
      setIsConverting(false);
    }
  };

  return {
    convertToMp3,
    isConverting,
    isLoading,
  };
}
