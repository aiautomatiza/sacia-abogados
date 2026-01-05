/**
 * @fileoverview Call Transcript Viewer
 * @description Transcript display component
 */

import { FileText, Copy, Check } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CallTranscriptViewerProps {
  transcript: string | null;
  maxHeight?: string;
}

export function CallTranscriptViewer({
  transcript,
  maxHeight = "400px",
}: CallTranscriptViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast.success("Transcripción copiada");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error al copiar");
    }
  };

  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-muted p-3 mb-3">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          No hay transcripción disponible para esta llamada
        </p>
      </div>
    );
  }

  // Parse transcript for better formatting
  const formattedTranscript = transcript
    .split("\n")
    .map((line, index) => {
      // Try to detect speaker patterns like "Agent:" or "[00:00:00]"
      const speakerMatch = line.match(/^(Agent|User|Sistema|Cliente|Agente):/i);
      const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]/);

      if (speakerMatch) {
        const speaker = speakerMatch[1];
        const content = line.substring(speakerMatch[0].length).trim();
        const isAgent = /^(Agent|Agente|Sistema)/i.test(speaker);
        return (
          <div key={index} className="mb-3">
            <span
              className={`text-xs font-semibold ${
                isAgent ? "text-primary" : "text-secondary-foreground"
              }`}
            >
              {speaker}:
            </span>
            <p className="text-sm text-foreground mt-0.5">{content}</p>
          </div>
        );
      }

      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        const content = line.substring(timestampMatch[0].length).trim();
        return (
          <div key={index} className="mb-3 flex gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              [{timestamp}]
            </span>
            <p className="text-sm text-foreground">{content}</p>
          </div>
        );
      }

      if (line.trim()) {
        return (
          <p key={index} className="text-sm text-foreground mb-2">
            {line}
          </p>
        );
      }

      return null;
    })
    .filter(Boolean);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <ScrollArea style={{ maxHeight }} className="pr-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          {formattedTranscript.length > 0 ? (
            formattedTranscript
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {transcript}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
