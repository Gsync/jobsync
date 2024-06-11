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
import { ScrollArea } from "./ui/scroll-area";
import { useState, useTransition } from "react";
import { delay } from "@/utils/delay";
import { createJobTitle, createLocation } from "@/actions/job.actions";
import { JobForm } from "@/models/job.model";
import { createCompany } from "@/actions/company.actions";

interface ComboboxProps {
  options: any[];
  field: ControllerRenderProps<JobForm, any>;
  creatable?: boolean;
}

export function Combobox({ options, field, creatable }: ComboboxProps) {
  const [newOption, setNewOption] = useState<string>("");
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();

  const onCreateOption = (label: string) => {
    if (!label) return;
    startTransition(async () => {
      let response;
      switch (field.name) {
        case "company":
          response = await createCompany(label);
          break;
        case "title":
          response = await createJobTitle(label);
          break;
        case "location":
          response = await createLocation(label);
          break;
        default:
          break;
      }
      options.unshift(response);
      field.onChange(response.id);
      setIsPopoverOpen(false);
    });
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "md:w-[240px] lg:w-[280px] justify-between capitalize",
              !field.value && "text-muted-foreground"
            )}
          >
            {field.value
              ? options.find((option) => option.id === field.value).label
              : `Select ${field.name}`}

            {isPending ? (
              <Loader className="h-4 w-4 shrink-0 spinner" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="md:w-[240px] lg:w-[280px] p-0">
        <Command>
          <CommandInput
            value={newOption}
            onValueChange={(val: string) => setNewOption(val)}
            placeholder={`${creatable ? "Create or " : ""}Search ${field.name}`}
          />
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
          <ScrollArea>
            <CommandGroup>
              <CommandList className="capitalize">
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
                        option.value === field.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
