"use client";

import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ControllerRenderProps } from "react-hook-form";
import { JobForm } from "@/models/job.model";
import { useState } from "react";
import { FormControl } from "./ui/form";

interface DatePickerProps {
  field: ControllerRenderProps<any, any>;
  presets: boolean;
  isEnabled: boolean;
  captionLayout?: boolean;
}

export function DatePicker({
  field,
  presets,
  isEnabled,
  captionLayout,
}: DatePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant={"outline"}
            className={cn(
              "md:w-[240px] lg:w-[280px] justify-start text-left font-normal",
              !field.value && "text-muted-foreground"
            )}
            disabled={!isEnabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {field.value ? format(field.value, "PP") : <span>Pick a date</span>}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
        {presets && (
          <Select
            onValueChange={(value) => {
              field.onChange(addDays(new Date(), parseInt(value)));
              setIsPopoverOpen(false);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Preset" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="0">Today</SelectItem>
              <SelectItem value="1">Tomorrow</SelectItem>
              <SelectItem value="3">In 3 days</SelectItem>
              <SelectItem value="7">In a week</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="rounded-md border">
          <Calendar
            mode="single"
            captionLayout={captionLayout ? "dropdown-buttons" : undefined}
            fromYear={captionLayout ? 1970 : undefined}
            toYear={captionLayout ? new Date().getFullYear() : undefined}
            selected={field.value}
            onSelect={(value) => {
              field.onChange(value);
              setIsPopoverOpen(false);
            }}
            //   disabled={(date) =>
            //     field.value > new Date() || field.value < new Date("1900-01-01")
            //   }
            // initialFocus // NOTE: Enabling this cause error in safari browser
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
