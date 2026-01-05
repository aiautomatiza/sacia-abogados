/**
 * @fileoverview Call Detail Modal
 * @description Modal with tabs (Detail/Transcript/Audio) - supports URL-controlled tabs
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CallDetailed } from "../types/call.types";
import type { CallDetailTab } from "../hooks/use-calls-url-state";
import {
  formatCallDuration,
  formatCallState,
  formatCallType,
  formatCallDateTime,
  getCallStateColor,
  getCallTypeColor,
  getCallStateIcon,
  getCallTypeIcon,
} from "../utils/call-formatters";
import { CallTranscriptViewer } from "./CallTranscriptViewer";
import { CallAudioPlayer } from "./CallAudioPlayer";

// Map URL tab names to internal tab values
const TAB_MAP: Record<CallDetailTab, string> = {
  summary: "detail",
  transcript: "transcript",
  audio: "audio",
};

const REVERSE_TAB_MAP: Record<string, CallDetailTab> = {
  detail: "summary",
  transcript: "transcript",
  audio: "audio",
};

interface CallDetailModalProps {
  call: CallDetailed | null;
  open: boolean;
  onClose: () => void;
  activeTab?: CallDetailTab;
  onTabChange?: (tab: CallDetailTab) => void;
}

export function CallDetailModal({ 
  call, 
  open, 
  onClose,
  activeTab = "summary",
  onTabChange,
}: CallDetailModalProps) {
  const handleTabChange = (value: string) => {
    const urlTab = REVERSE_TAB_MAP[value];
    if (urlTab && onTabChange) {
      onTabChange(urlTab);
    }
  };

  // Loading state when call is being fetched
  if (!call) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cargando llamada...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const StateIcon = getCallStateIcon(call.state);
  const TypeIcon = getCallTypeIcon(call.type);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Detalle de llamada</span>
            <Badge
              variant="outline"
              className={cn("gap-1", getCallStateColor(call.state))}
            >
              <StateIcon className="h-3 w-3" />
              {formatCallState(call.state)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs 
          value={TAB_MAP[activeTab]} 
          onValueChange={handleTabChange}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detail">Detalle</TabsTrigger>
            <TabsTrigger value="transcript">Transcripción</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="flex-1 overflow-auto">
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Información del contacto
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="font-medium">
                      {call.contact_name || "Sin nombre"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium font-mono">
                      {call.contact_phone || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Call Info */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Información de la llamada
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha y hora</p>
                    <p className="font-medium">
                      {formatCallDateTime(call.call_datetime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <Badge
                      variant="outline"
                      className={cn("gap-1 mt-1", getCallTypeColor(call.type))}
                    >
                      <TypeIcon className="h-3 w-3" />
                      {formatCallType(call.type)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duración</p>
                    <p className="font-medium tabular-nums">
                      {formatCallDuration(call.duration_seconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Duración audio
                    </p>
                    <p className="font-medium tabular-nums">
                      {formatCallDuration(call.audio_duration_seconds)}
                    </p>
                  </div>
                  {call.end_reason && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Motivo de finalización
                      </p>
                      <p className="font-medium">{call.end_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {call.summary && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Resumen
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {call.summary}
                    </p>
                  </div>
                </>
              )}

              {/* Agent Info */}
              {call.agent_email && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Agente
                    </h4>
                    <p className="text-sm">{call.agent_email}</p>
                  </div>
                </>
              )}

              {/* Technical Info */}
              {call.call_sid && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Información técnica
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Call SID</p>
                        <p className="font-mono text-xs break-all">
                          {call.call_sid}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transcript" className="flex-1 overflow-auto">
            <div className="py-4">
              <CallTranscriptViewer transcript={call.transcript} />
            </div>
          </TabsContent>

          <TabsContent value="audio" className="flex-1 overflow-auto">
            <div className="py-4">
              <CallAudioPlayer audioUrl={call.audio_url} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
