"use client";

import { useState, useTransition } from "react";
import { X, Loader2, ChevronsUpDown, CirclePlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toastError } from "@/lib/toast";
import type { EntityOption } from "./types";

// Generic chip input that searches existing DB entities and can create new ones.
// `values` is a string[] of labels (not IDs) stored in the source config.
export function EntityStringChipInput({
  label,
  description,
  placeholder,
  noun,
  values,
  onChange,
  loadOptions,
  createOption,
}: {
  label: string;
  description: string;
  placeholder: string;
  noun: string;
  values: string[];
  onChange: (next: string[]) => void;
  loadOptions: () => Promise<EntityOption[]>;
  createOption: (label: string) => Promise<EntityOption | null>;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, startCreate] = useTransition();

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && !loaded) {
      setIsLoading(true);
      loadOptions()
        .then((opts) => {
          setOptions(Array.isArray(opts) ? opts : []);
          setLoaded(true);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  };

  const inputLower = input.trim().toLowerCase();

  const filtered = options.filter(
    (o) => !values.includes(o.label) && o.label.toLowerCase().includes(inputLower),
  );

  const exactMatch = options.some((o) => o.value === inputLower);
  const alreadyAdded = values.some((v) => v.toLowerCase() === inputLower);

  const addLabel = (lbl: string) => {
    const trimmed = lbl.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput("");
    setOpen(false);
  };

  const handleCreate = () => {
    const lbl = input.trim();
    if (!lbl || alreadyAdded || isCreating) return;
    startCreate(async () => {
      const created = await createOption(lbl);
      if (!created) {
        toastError(`Failed to create ${noun}.`);
        return;
      }
      setOptions((prev) =>
        prev.some((o) => o.id === created.id) ? prev : [...prev, created],
      );
      addLabel(created.label);
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={handleOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal text-muted-foreground"
          >
            {placeholder}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width)"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search or create ${noun}...`}
              value={input}
              onValueChange={setInput}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
              {!isLoading && !input.trim() && filtered.length === 0 && (
                <CommandEmpty>No {noun}s found. Type to create one.</CommandEmpty>
              )}
              {input.trim() && alreadyAdded && (
                <CommandEmpty>Already added.</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((o) => (
                    <CommandItem
                      key={o.id}
                      value={o.value}
                      onSelect={() => addLabel(o.label)}
                    >
                      {o.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {input.trim() && !exactMatch && !alreadyAdded && (
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreate}
                    disabled={isCreating}
                    className="text-primary"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CirclePlus className="h-4 w-4 mr-2" />
                    )}
                    Create &quot;{input.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
