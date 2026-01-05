/**
 * @fileoverview Tenant Comments Display Component - ADAPTADO PARA TENANT-BASED
 * @description Displays tenant comments for a contact (placeholder implementation)
 *
 * CAMBIOS vs original (ClinicCommentsDisplay):
 * - Renombrado de ClinicCommentsDisplay a TenantCommentsDisplay
 * - Acepta contactId y tenantId para cargar comentarios
 * - Comentarios del tenant (no de clínica)
 */

import React from "react";
import { safeFormatDate } from "@/lib/utils/date-formatters";

// Tipo adaptado para comentarios del tenant
export interface TenantComment {
  content: string;
  created_at: string;
  created_by_name?: string;
}

interface TenantCommentsDisplayProps {
  contactId: string;
  tenantId: string;
}

export function TenantCommentsDisplay({ contactId, tenantId }: TenantCommentsDisplayProps) {
  // TODO: Implementar carga de comentarios desde la base de datos
  // Por ahora, retornamos un placeholder
  const comments: TenantComment[] = [];
  
  if (!comments || comments.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium mb-2">Comentarios</h3>
        <p className="text-sm text-muted-foreground">Sin comentarios</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment, index) => {
        // Safely format the date, returns '—' if invalid
        const formattedDate = safeFormatDate(comment.created_at, "d MMM yyyy");

        return (
          <div key={index} className="p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{comment.created_by_name || "Usuario"}</span>
              {/* Only show date if valid (not the fallback) */}
              {formattedDate !== "—" && <span className="text-xs text-muted-foreground">{formattedDate}</span>}
            </div>
            {/* Only show content if not empty */}
            {comment.content && <p className="text-sm whitespace-pre-wrap">{comment.content}</p>}
          </div>
        );
      })}
    </div>
  );
}
