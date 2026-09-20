"use client";

import { Clock, Minus, Plus } from "lucide-react";
import { addMinutes, format, parse } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { ControllerRenderProps } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormControl } from "./ui/form";

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MERIDIEMS = ["AM", "PM"];

const TIME_PATTERN = /^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;

const TIME_FORMAT = "hh:mm a";
const FALLBACK_TIME = "12:00 AM";
const STEP_MINUTES = 5;

type TimeParts = {
  hour: string | null;
  minute: string | null;
  meridiem: string | null;
};

function parseTime(value: unknown): TimeParts {
  const match = typeof value === "string" ? value.match(TIME_PATTERN) : null;
  return match
    ? { hour: match[1], minute: match[2], meridiem: match[3] }
    : { hour: null, minute: null, meridiem: null };
}

interface TimeColumnProps {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (option: string) => void;
}

function TimeColumn({ label, options, selected, onSelect }: TimeColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Popover content mounts on open, so this centres the active option once,
  // via scrollTop rather than scrollIntoView, which would move the dialog too.
  useEffect(() => {
    const list = listRef.current;
    const item = selectedRef.current;
    if (!list || !item) return;
    list.scrollTop =
      item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2;
  }, []);

  return (
    <div
      ref={listRef}
      role="group"
      aria-label={label}
      className="h-[220px] w-16 overflow-y-auto rounded-md border p-1"
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Button
            key={option}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            aria-pressed={isSelected}
            variant={isSelected ? "default" : "ghost"}
            size="sm"
            className={cn("w-full", !isSelected && "font-normal")}
            onClick={() => onSelect(option)}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}

interface TimePickerProps {
  field: ControllerRenderProps<any, any>;
  fullWidth?: boolean;
}

export function TimePicker({ field, fullWidth }: TimePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { hour, minute, meridiem } = parseTime(field.value);

  const update = (parts: Partial<TimeParts>) => {
    const next = {
      hour: parts.hour ?? hour ?? "12",
      minute: parts.minute ?? minute ?? "00",
      meridiem: parts.meridiem ?? meridiem ?? "AM",
    };
    field.onChange(`${next.hour}:${next.minute} ${next.meridiem}`);
  };

  // Stepping past midnight wraps the clock only — the date fields own the day
  const shift = (minutes: number) => {
    const current = TIME_PATTERN.test(field.value)
      ? field.value
      : FALLBACK_TIME;
    const stepped = addMinutes(parse(current, TIME_FORMAT, new Date()), minutes);
    field.onChange(format(stepped, TIME_FORMAT));
  };

  return (
    <div
      className={cn(
        "flex",
        fullWidth ? "w-full" : "md:w-[240px] lg:w-[280px]",
      )}
    >
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen} modal>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              type="button"
              onBlur={field.onBlur}
              variant={"outline"}
              className={cn(
                "flex-1 justify-start rounded-r-none text-left font-normal",
                !field.value && "text-muted-foreground"
              )}
            >
              <Clock className="mr-2 h-4 w-4" />
              {field.value ? field.value : <span>Pick a time</span>}
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto gap-2 p-2" align="start">
          <TimeColumn
            label="Hour"
            options={HOURS}
            selected={hour}
            onSelect={(value) => update({ hour: value })}
          />
          <TimeColumn
            label="Minute"
            options={MINUTES}
            selected={minute}
            onSelect={(value) => update({ minute: value })}
          />
          <TimeColumn
            label="AM/PM"
            options={MERIDIEMS}
            selected={meridiem}
            onSelect={(value) => update({ meridiem: value })}
          />
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`${STEP_MINUTES} minutes earlier`}
        className="shrink-0 rounded-none border-l-0"
        onClick={() => shift(-STEP_MINUTES)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`${STEP_MINUTES} minutes later`}
        className="shrink-0 rounded-l-none border-l-0"
        onClick={() => shift(STEP_MINUTES)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
