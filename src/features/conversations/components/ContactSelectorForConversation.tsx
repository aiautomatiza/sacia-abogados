/**
 * @fileoverview Contact Selector Component - ADAPTADO PARA TENANT-BASED
 * @description Selector for choosing a contact when creating a conversation
 *
 * CAMBIOS vs original:
 * - ❌ Eliminado: Filtros por clinic_id
 * - ✅ Adaptado: contact.nombre, contact.numero
 * - ✅ Adaptado: Solo busca contactos del tenant actual
 * - Sin cambios en UI
 */

import { useState, useEffect, useMemo } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  nombre: string;
  numero: string | null;
  attributes?: Record<string, any>;
}

interface Props {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelect: (contactId: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ContactSelectorForConversation({
  contacts,
  selectedContactId,
  onSelect,
  isLoading = false,
  placeholder = "Buscar contacto...",
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.nombre?.toLowerCase().includes(query) ||
        contact.numero?.includes(query) ||
        contact.attributes?.email?.toLowerCase().includes(query),
    );
  }, [contacts, searchQuery]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-sm text-muted-foreground">Cargando contactos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
            onClick={handleClearSearch}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Contacts List */}
      <ScrollArea className="h-80 border rounded-md">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <User className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery ? "No se encontraron contactos" : "No hay contactos disponibles"}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredContacts.map((contact) => {
              const isSelected = contact.id === selectedContactId;
              const email = contact.attributes?.email;

              return (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left",
                    isSelected && "bg-accent border-2 border-primary",
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {contact.nombre ? getInitials(contact.nombre) : "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.nombre || "Sin nombre"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.numero && <span className="truncate">{contact.numero}</span>}
                      {email && contact.numero && <span>•</span>}
                      {email && <span className="truncate">{email}</span>}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-xs text-muted-foreground text-center">{filteredContacts.length} contacto(s) encontrado(s)</p>
      )}
    </div>
  );
}
