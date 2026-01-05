/**
 * @fileoverview Call Audio Player
 * @description Audio player component for call recordings
 */

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Volume2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallAudio } from "../hooks/use-call-audio";

interface CallAudioPlayerProps {
  audioUrl: string | null;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CallAudioPlayer({ audioUrl }: CallAudioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isLoading,
    error,
    toggle,
    seek,
    setPlaybackRate,
    skipForward,
    skipBackward,
    playbackRates,
  } = useCallAudio(audioUrl);

  if (!audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Volume2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          No hay audio disponible para esta llamada
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-3">
          <Volume2 className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-destructive text-center">{error}</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={([value]) => {
            const newTime = (value / 100) * duration;
            seek(newTime);
          }}
          className="cursor-pointer"
          disabled={isLoading}
        />
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skipBackward(10)}
          disabled={isLoading}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggle}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => skipForward(10)}
          disabled={isLoading}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Speed & Download */}
      <div className="flex items-center justify-between">
        <Select
          value={playbackRate.toString()}
          onValueChange={(value) => setPlaybackRate(parseFloat(value))}
        >
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {playbackRates.map((rate) => (
              <SelectItem key={rate} value={rate.toString()}>
                {rate}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" asChild>
          <a href={audioUrl} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </a>
        </Button>
      </div>
    </div>
  );
}
