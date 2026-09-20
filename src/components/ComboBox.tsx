"use client";

import { Check, ChevronsUpDown, CirclePlus, Loader } from "lucide-react";
import { ControllerRenderProps } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormControl } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useTransition } from "react";
import { delay } from "@/utils/delay";
import { createLocation } from "@/actions/job.actions";
import { JobForm } from "@/models/job.model";
import { addCompany } from "@/actions/company.actions";
import { createJobTitle } from "@/actions/jobtitle.actions";
import { toastError } from "@/lib/toast";
import { createActivityType } from "@/actions/activity.actions";
import { createJobSource } from "@/actions/job.actions";
import { createContactRole } from "@/actions/contactRole.actions";

interface ComboboxProps {
  options: any[];
  field: ControllerRenderProps<any, any>;
  creatable?: boolean;
  freeText?: boolean;
  label?: string;
  onSearchChange?: (search: string) => void;
  // Opt out of the default fixed trigger width when the field sits in a grid
  fullWidth?: boolean;
}

export function Combobox({
  options,
  field,
  creatable,
  freeText,
  label,
  onSearchChange,
  fullWidth,
}: ComboboxProps) {
  // Placeholder text only; the accessible name comes from FormLabel/FormControl
  const displayName = label ?? field.name;
  const [newOption, setNewOption] = useState<string>("");
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();
  const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    // Scope to this Command; a global query matches other mounted cmdk lists
    const hasHighlightedItem = !!e.currentTarget
      .closest("[cmdk-root]")
      ?.querySelector('[cmdk-item][aria-selected="true"]');

    if (hasHighlightedItem) return;

    if (!creatable) return;

    const label = newOption.trim();
    if (!label) return;

    e.preventDefault();
    onCreateOption(label);
    setNewOption("");
  };
  const onCreateOption = (label: string) => {
    if (!label) return;
    // A free-text field has no reference record behind it — the typed text is
    // itself the stored value, so there is nothing to create server-side.
    if (freeText) {
      // CommandEmpty's onClick passes the raw input; only Enter pre-trims
      field.onChange(label.trim());
      setIsPopoverOpen(false);
      return;
    }
    startTransition(async () => {
      let response;
      switch (field.name) {
        case "company":
          const res = await addCompany({ company: label });
          response = res.data;
          break;
        case "title":
          response = await createJobTitle(label);
          break;
        case "location":
          const { data, success, message } = await createLocation(label);
          if (!success) {
            toastError(message);
          }
          response = data;
          break;
        case "source":
          const sourceRes = await createJobSource(label);
          if (!sourceRes.success) {
            toastError(sourceRes.message);
          }
          response = sourceRes.data;
          if (!sourceRes.success) return;
          break;
        case "workedAtCompany":
          const workedRes = await addCompany({ company: label });
          response = workedRes.data;
          break;
        case "contactRole":
          const roleRes = await createContactRole(label);
          if (!roleRes.success) {
            toastError(roleRes.message);
            return;
          }
          response = roleRes.data;
          break;
        case "activityType":
          response = await createActivityType(label);
          break;
        default:
          break;
      }
      if (!response?.id) return;
      options.unshift(response);
      field.onChange(response.id);
      setIsPopoverOpen(false);
    });
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen} modal>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "justify-between",
              fullWidth ? "w-full" : "md:w-[240px] lg:w-[280px]",
              !field.value && "text-muted-foreground"
            )}
          >
            <span className="min-w-0 truncate">
              {field.value
                ? (options.find((option) => option.id === field.value)?.label ??
                  (freeText ? field.value : null))
                : `Select ${displayName}`}
            </span>

            {isPending ? (
              <Loader className="h-4 w-4 shrink-0 spinner" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0",
          fullWidth
            ? "w-(--radix-popover-trigger-width)"
            : "md:w-[240px] lg:w-[280px]"
        )}
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput
            value={newOption}
            onValueChange={(val: string) => {
              setNewOption(val);
              onSearchChange?.(val);
            }}
            placeholder={`${creatable ? "Create or " : ""}Search ${displayName}`}
            onKeyDown={(e) => handleEnterKey(e)}
          />
          <CommandList>
            <CommandEmpty
              onClick={() => {
                onCreateOption(newOption);
                setNewOption("");
              }}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1 italic mt-2",
                !newOption && "text-muted-foreground cursor-default"
              )}
            >
              {creatable ? (
                <>
                  <CirclePlus className="h-4 w-4" />
                  <p>Create: </p>
                  <p className="block max-w-48 truncate font-semibold text-primary">
                    {newOption}
                  </p>
                </>
              ) : (
                <p className="font-semibold text-primary">No source found!</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  value={option.value}
                  key={option.id}
                  onSelect={() => {
                    if (field.onChange) {
                      field.onChange(option.id);
                      setIsPopoverOpen(false);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.id === field.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
