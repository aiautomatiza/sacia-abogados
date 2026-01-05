/**
 * @fileoverview Contact Field Group Component - ADAPTADO PARA TENANT-BASED
 * @description Groups related contact fields with a title and icon
 *
 * CAMBIOS vs original:
 * - Ninguno (componente simple sin referencias a clinic/account)
 */

import React from "react";

interface ContactFieldGroupProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function ContactFieldGroup({ title, icon, children }: ContactFieldGroupProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="h-4 w-4">{icon}</span>}
        <h4>{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
