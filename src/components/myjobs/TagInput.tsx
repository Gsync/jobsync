"use client";
import { useState, useTransition } from "react";
import { X, ChevronsUpDown, CirclePlus, Loader } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag } from "@/models/job.model";
import { createTag } from "@/actions/tag.actions";
import { toast } from "../ui/use-toast";
import { cn } from "@/lib/utils";

const MAX_TAGS = 10;

interface TagInputProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagInput({
  availableTags,
  selectedTagIds,
  onChange,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [localTags, setLocalTags] = useState<Tag[]>(availableTags);
  const [isPending, startTransition] = useTransition();

  const selectedTags = localTags.filter((t) => selectedTagIds.includes(t.id));
  const isMaxReached = selectedTagIds.length >= MAX_TAGS;

  // Tags not yet selected, filtered by input
  const filteredOptions = localTags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  // Whether the typed value exactly matches an existing tag (case-insensitive)
  const exactMatchExists = localTags.some(
    (t) => t.value === inputValue.trim().toLowerCase(),
  );

  const addTagById = (id: string) => {
    if (selectedTagIds.length >= MAX_TAGS) return;
    onChange([...selectedTagIds, id]);
  };

  const removeTagById = (id: string) => {
    onChange(selectedTagIds.filter((tid) => tid !== id));
  };

  const handleCreate = () => {
    const label = inputValue.trim();
    if (!label || isMaxReached) return;

    startTransition(async () => {
      const result = await createTag(label);
      if (!result?.success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: result?.message ?? "Failed to create skill tag.",
        });
        return;
      }
      const newTag: Tag = result.data;
      // Add to local pool if not already there
      setLocalTags((prev) =>
        prev.some((t) => t.id === newTag.id) ? prev : [...prev, newTag],
      );
      addTagById(newTag.id);
      setInputValue("");
      setOpen(false);
    });
  };

  const handleSelect = (tagId: string) => {
    addTagById(tagId);
    setInputValue("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              isMaxReached && "opacity-50 cursor-not-allowed",
            )}
            disabled={isMaxReached}
            type="button"
          >
            {isMaxReached
              ? `Max ${MAX_TAGS} skills reached`
              : "Search or add a skill..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type a skill..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {filteredOptions.length === 0 && !inputValue && (
                <CommandEmpty>No skills found.</CommandEmpty>
              )}
              {filteredOptions.length > 0 && (
                <CommandGroup>
                  {filteredOptions.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleSelect(tag.id)}
                    >
                      {tag.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {inputValue.trim() && !exactMatchExists && (
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreate}
                    disabled={isPending || isMaxReached}
                    className="text-primary"
                  >
                    {isPending ? (
                      <Loader className="mr-2 h-4 w-4 spinner" />
                    ) : (
                      <CirclePlus className="mr-2 h-4 w-4" />
                    )}
                    Create &quot;{inputValue.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
              {tag.label}
              <button
                type="button"
                onClick={() => removeTagById(tag.id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${tag.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
