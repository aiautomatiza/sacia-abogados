/**
 * @fileoverview Conversations Sidebar Component - ADAPTADO PARA TENANT-BASED
 * @description Left sidebar with conversation list, search, filters, and infinite scroll
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Filter, X, ArrowUpDown, Loader2 } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationItem } from './ConversationItem';
import { ConversationsSkeleton } from './ConversationsSkeleton';
import type { ConversationWithContact, LocalConversationFilters as ConversationFilters } from "../types";

interface Props {
  conversations: ConversationWithContact[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  onCreateNew?: () => void;
  onFiltersChange?: (filters: ConversationFilters) => void;
  filters?: ConversationFilters;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

type SortField = "last_message" | "unread_first" | "name" | "created_at";
type SortDirection = "asc" | "desc";

export function ConversationsSidebar({
  conversations,
  selectedId,
  onSelect,
  onCreateNew,
  onFiltersChange,
  filters = {},
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>(filters.sort_by || "last_message");
  const [sortDirection, setSortDirection] = useState<SortDirection>(filters.sort_order || "desc");

  // Ref for virtualization
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce timer for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // Altura estimada por item en pixels
    overscan: 5, // Pre-renderizar 5 items arriba/abajo
  });

  // Infinite scroll with virtualizer
  useEffect(() => {
    const [lastItem] = virtualizer.getVirtualItems().slice(-1);
    if (!lastItem) return;

    if (
      lastItem.index >= conversations.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      onLoadMore?.();
    }
  }, [
    virtualizer.getVirtualItems(),
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    conversations.length,
  ]);

  // Sync search query with filters
  useEffect(() => {
    setSearchQuery(filters.search || "");
  }, [filters.search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // Debounce the filter change
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        if (onFiltersChange) {
          onFiltersChange({ ...filters, search: value || undefined });
        }
      }, 300);
    },
    [filters, onFiltersChange]
  );

  const handleClearSearch = () => {
    setSearchQuery("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (onFiltersChange) {
      onFiltersChange({ ...filters, search: undefined });
    }
  };


  const handleSortFieldChange = (field: SortField) => {
    setSortField(field);
    onFiltersChange?.({ ...filters, sort_by: field, sort_order: sortDirection });
  };

  const toggleSortDirection = () => {
    const newDirection = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(newDirection);
    onFiltersChange?.({ ...filters, sort_by: sortField, sort_order: newDirection });
  };

  return (
    <div className="w-full border-r bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, teléfono..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
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

        {/* Filters + New button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("flex-1", showFilters && "bg-accent")}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filtros
          </Button>
          {onCreateNew && (
            <Button size="sm" onClick={onCreateNew} className="flex-1">
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva
            </Button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex gap-2">
          <Select value={sortField} onValueChange={(v) => handleSortFieldChange(v as SortField)}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_message">Último mensaje</SelectItem>
              <SelectItem value="unread_first">No leídos primero</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="created_at">Fecha creación</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={toggleSortDirection}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortDirection === "desc" ? "Desc" : "Asc"}
          </Button>
        </div>

        {/* Quick Filters */}
        {showFilters && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!filters.status?.length ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onFiltersChange?.({ ...filters, status: undefined })}
              >
                Todas
              </Button>
              <Button
                variant={filters.status?.includes("active") ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onFiltersChange?.({ ...filters, status: ["active"] })}
              >
                Activas
              </Button>
              <Button
                variant={filters.has_unread ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  onFiltersChange?.({
                    ...filters,
                    has_unread: !filters.has_unread,
                  })
                }
              >
                No leídas
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Conversations List - VIRTUALIZADO */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ overflowAnchor: 'none' }}
      >
        {isLoading && conversations.length === 0 ? (
          <ConversationsSkeleton />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 p-4">
            <p className="text-sm text-muted-foreground text-center">
              No hay conversaciones
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = conversations[virtualRow.index];
              const isSelected = conversation.id === selectedId;
              const hasUnread = conversation.unread_count > 0;

              return (
                <div
                  key={conversation.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConversationItem
                    conversation={conversation}
                    isSelected={isSelected}
                    hasUnread={hasUnread}
                    onSelect={onSelect}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Loading indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
