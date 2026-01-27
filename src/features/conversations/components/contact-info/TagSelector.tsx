/**
 * @fileoverview Tag Selector Component
 * @description Allows selecting, creating, and managing conversation tags
 */

import { useState, useMemo } from "react";
import { Check, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTags } from "../../hooks/useTags";
import { useAuth } from "@/contexts/auth-context";
import type { ConversationTag } from "../../types";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

// Predefined colors for new tags
const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function TagSelector({ selectedTags, onTagsChange, disabled }: TagSelectorProps) {
  const { scope } = useAuth();
  const { tags, isLoading, createTagAsync, isCreating } = useTags();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Create a map of tag names to tag objects for quick lookup
  const tagMap = useMemo(() => {
    const map = new Map<string, ConversationTag>();
    tags.forEach((tag) => map.set(tag.name, tag));
    return map;
  }, [tags]);

  // Filter tags based on search when adding new
  const filteredTags = useMemo(() => {
    if (!newTagName.trim()) return tags;
    const search = newTagName.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(search));
  }, [tags, newTagName]);

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleRemoveTag = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(selectedTags.filter((t) => t !== tagName));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !scope?.tenantId) return;

    // Check if tag already exists
    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (existingTag) {
      // If exists, just select it
      if (!selectedTags.includes(existingTag.name)) {
        onTagsChange([...selectedTags, existingTag.name]);
      }
      setNewTagName("");
      setIsAddingNew(false);
      return;
    }

    try {
      // Assign a random color from predefined colors
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

      const newTag = await createTagAsync({
        tenant_id: scope.tenantId,
        name: newTagName.trim(),
        color: randomColor,
      });

      // Add the new tag to selection
      onTagsChange([...selectedTags, newTag.name]);
      setNewTagName("");
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === "Escape") {
      setNewTagName("");
      setIsAddingNew(false);
    }
  };

  const getTagColor = (tagName: string): string | undefined => {
    return tagMap.get(tagName)?.color || undefined;
  };

  return (
    <div className="space-y-2">
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {selectedTags.length > 0 ? (
          selectedTags.map((tagName) => {
            const color = getTagColor(tagName);
            return (
              <Badge
                key={tagName}
                variant="secondary"
                className="gap-1 pr-1"
                style={color ? { backgroundColor: `${color}20`, borderColor: color, color } : undefined}
              >
                {tagName}
                {!disabled && (
                  <button
                    onClick={(e) => handleRemoveTag(tagName, e)}
                    className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })
        ) : (
          <span className="text-sm text-muted-foreground">Sin etiquetas</span>
        )}
      </div>

      {/* Tag selector popover */}
      {!disabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Gestionar etiquetas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            {/* New tag input */}
            <div className="flex gap-1 mb-2">
              <Input
                placeholder="Buscar o crear etiqueta..."
                value={newTagName}
                onChange={(e) => {
                  setNewTagName(e.target.value);
                  setIsAddingNew(true);
                }}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
              />
              {newTagName.trim() && !tags.some((t) => t.name.toLowerCase() === newTagName.trim().toLowerCase()) && (
                <Button
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Tags list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-0.5">
                  {filteredTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      {newTagName.trim()
                        ? "Presiona Enter o + para crear"
                        : "No hay etiquetas"}
                    </p>
                  ) : (
                    filteredTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.name)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors ${
                            isSelected ? "bg-accent" : ""
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{
                              backgroundColor: tag.color || "#888",
                              borderColor: tag.color || "#888",
                            }}
                          />
                          <span className="flex-1 text-left truncate">{tag.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
