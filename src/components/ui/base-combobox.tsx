"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

/**
 * BaseCombobox — shared headless wrapper for all combobox variants.
 *
 * Provides the common Popover + Command + trigger button shell.
 * Callers render their own CommandGroup / CommandItem trees via `children`.
 *
 * This is the Layer 2 component described in the C4 ComboBox analysis
 * (docs/architecture/c4-component-combobox.md). It extracts the duplicated
 * Popover + trigger + input boilerplate so that specialised variants
 * (Combobox, TagInput, EuresLocationCombobox, EuresOccupationCombobox)
 * can adopt it as their outer shell.
 *
 * NOTE: Currently only consumed by the generic Combobox. Other variants
 * can migrate incrementally per C4 Recommendation 2.
 */

export interface BaseComboboxProps {
  /** Text shown on the trigger button when nothing is selected */
  triggerLabel: string;
  /** Optional override for trigger button content (e.g. selected value label) */
  triggerContent?: React.ReactNode;
  /** CommandInput placeholder */
  placeholder?: string;
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Controlled search input value */
  inputValue: string;
  /** Callback when search input changes */
  onInputValueChange: (value: string) => void;
  /** Custom filter function for Command */
  filter?: (value: string, search: string) => number;
  /** Whether the trigger is disabled */
  disabled?: boolean;
  /** Optional trailing icon override for the trigger button */
  triggerIcon?: React.ReactNode;
  /** Additional className for the trigger button */
  triggerClassName?: string;
  /** Additional className for the popover content */
  contentClassName?: string;
  /** Children rendered inside the Command (CommandGroup, CommandEmpty, etc.) */
  children: React.ReactNode;
}

export function BaseCombobox({
  triggerLabel,
  triggerContent,
  placeholder,
  open,
  onOpenChange,
  inputValue,
  onInputValueChange,
  filter,
  disabled,
  triggerIcon,
  triggerClassName,
  contentClassName,
  children,
}: BaseComboboxProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "md:w-[240px] lg:w-[280px] justify-between capitalize",
            triggerClassName
          )}
        >
          {triggerContent ?? (
            <span className="text-muted-foreground">{triggerLabel}</span>
          )}
          {triggerIcon ?? (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("md:w-[240px] lg:w-[280px] p-0", contentClassName)}
      >
        <Command filter={filter}>
          <CommandInput
            value={inputValue}
            onValueChange={onInputValueChange}
            placeholder={placeholder}
          />
          <CommandList>{children}</CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
