"use client";

import { Check, ChevronsUpDown, CirclePlus, Loader } from "lucide-react";
import { ControllerRenderProps, FieldName } from "react-hook-form";

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
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Job } from "@/models/job.model";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { upsertCompanyName } from "@/utils/company";
import { delay } from "@/utils/delay";

interface ComboboxProps {
  dataKeys: string[];
  options: any[];
  field: ControllerRenderProps<Job, any>;
}

export function Combobox({ options, field, dataKeys }: ComboboxProps) {
  const [newOption, setNewOption] = useState<string>("");
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [key1, key2] = dataKeys;
  async function onCreateOption(value: string) {
    setLoading(true);
    try {
      if (field.name === "company") {
        const newOption = await upsertCompanyName(value);
        options.unshift(newOption);
        field.onChange(newOption[key2]);
        setIsPopoverOpen(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

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
              ? options.find((option) => option[key2] === field.value)[key1]
              : `Select ${field.name}`}

            {loading ? (
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
            placeholder={`Search ${field.name}`}
          />
          <CommandEmpty
            onClick={() => {
              onCreateOption(newOption);
              setNewOption("");
            }}
            className="flex cursor-pointer items-center justify-center gap-1 italic"
          >
            {field.name === "company" ? (
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
                    value={option[key1]}
                    key={option[key2]}
                    onSelect={() => {
                      if (field.onChange) {
                        field.onChange(option[key2]);
                        setIsPopoverOpen(false);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        option[key2] === field.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option[key1]}
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
