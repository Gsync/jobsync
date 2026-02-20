"use client";

import { useEffect, useRef, useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { Loader2 } from "lucide-react";

import type { CreateAutomationInput } from "@/models/automation.schema";
import type { EuresOccupationSuggestion } from "@/lib/scraper/eures/autocomplete";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type EuresOccupationComboboxProps = {
  field: ControllerRenderProps<CreateAutomationInput, "keywords">;
  language?: string;
};

export function EuresOccupationCombobox({
  field,
  language = "en",
}: EuresOccupationComboboxProps) {
  const [suggestions, setSuggestions] = useState<EuresOccupationSuggestion[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSuggestions = (keyword: string) => {
    clearTimeout(debounceRef.current);
    if (keyword.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/eures/occupations?keyword=${encodeURIComponent(keyword)}&language=${language}`,
        );
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setIsOpen((data.results ?? []).length > 0);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            placeholder="e.g., Software Developer"
            value={field.value}
            onChange={(e) => {
              field.onChange(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 150);
              field.onBlur();
            }}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-60 overflow-y-auto py-1">
          {suggestions.map((s) => (
            <li
              key={s.suggest}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                field.onChange(s.suggest);
                setSuggestions([]);
                setIsOpen(false);
              }}
            >
              <span>{s.suggest}</span>
              <span className="text-xs text-muted-foreground">
                {s.frequency.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
