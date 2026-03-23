"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface ChipItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional action button rendered after the label (e.g., detail/link icon) */
  action?: React.ReactNode;
}

interface ChipListProps {
  items: ChipItem[];
  onRemove: (value: string) => void;
  onEdit?: (oldValue: string, newValue: string) => void;
  editable?: boolean;
}

export function ChipList({
  items,
  onRemove,
  onEdit,
  editable = false,
}: ChipListProps) {
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  if (items.length === 0) return null;

  const startEdit = (item: ChipItem) => {
    if (!editable || !onEdit) return;
    setEditingValue(item.value);
    setEditText(item.label);
  };

  const commitEdit = () => {
    if (editingValue && onEdit && editText.trim()) {
      onEdit(editingValue, editText.trim());
    }
    setEditingValue(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingValue(null);
    setEditText("");
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        if (editingValue === item.value) {
          return (
            <Input
              key={item.value}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit();
                }
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={commitEdit}
              className="h-6 w-40 px-2 py-0 text-xs"
              autoFocus
            />
          );
        }

        return (
          <Badge
            key={item.value}
            variant="secondary"
            className="gap-1.5 pr-1"
          >
            {item.icon}
            <span
              className={editable ? "cursor-pointer hover:underline" : undefined}
              onClick={() => startEdit(item)}
              role={editable ? "button" : undefined}
              tabIndex={editable ? 0 : undefined}
              onKeyDown={
                editable
                  ? (e) => {
                      if (e.key === "Enter") startEdit(item);
                    }
                  : undefined
              }
            >
              {item.label}
            </span>
            {item.action}
            <button
              type="button"
              onClick={() => onRemove(item.value)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              aria-label={`Remove ${item.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}
