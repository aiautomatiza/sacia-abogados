/**
 * @fileoverview Call Audio Hook
 * @description Audio player control
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { AudioPlayerState } from "../types/call.types";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function useCallAudio(audioUrl: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    isLoading: false,
    error: null,
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) {
      audioRef.current = null;
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        error: null,
      }));
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Error al cargar el audio",
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration));
      setState((prev) => ({ ...prev, currentTime: audioRef.current!.currentTime }));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState((prev) => ({ ...prev, playbackRate: rate }));
    }
  }, []);

  const skipForward = useCallback((seconds: number = 10) => {
    if (audioRef.current) {
      seek(audioRef.current.currentTime + seconds);
    }
  }, [seek]);

  const skipBackward = useCallback((seconds: number = 10) => {
    if (audioRef.current) {
      seek(audioRef.current.currentTime - seconds);
    }
  }, [seek]);

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    setPlaybackRate,
    skipForward,
    skipBackward,
    playbackRates: PLAYBACK_RATES,
  };
}
