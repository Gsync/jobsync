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
import { ClockFormat } from "@/models/userSettings.model";
import { useClockFormat } from "@/context/UserSettingsContext";

const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MERIDIEMS = ["AM", "PM"];

const TIME_12_PATTERN = /^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;
const TIME_24_PATTERN = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

const STEP_MINUTES = 5;

type TimeParts = {
  hour: string | null;
  minute: string | null;
  meridiem: string | null;
};

function parseTime(value: unknown, is24h: boolean): TimeParts {
  if (typeof value !== "string") {
    return { hour: null, minute: null, meridiem: null };
  }

  const match12 = value.match(TIME_12_PATTERN);
  if (match12) {
    if (is24h) {
      let h = parseInt(match12[1], 10);
      const isPM = match12[3] === "PM";
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return {
        hour: String(h).padStart(2, "0"),
        minute: match12[2],
        meridiem: null,
      };
    }
    return { hour: match12[1], minute: match12[2], meridiem: match12[3] };
  }

  const match24 = value.match(TIME_24_PATTERN);
  if (match24) {
    if (is24h) {
      return { hour: match24[1], minute: match24[2], meridiem: null };
    }
    let h = parseInt(match24[1], 10);
    const meridiem = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return {
      hour: String(h).padStart(2, "0"),
      minute: match24[2],
      meridiem,
    };
  }

  return { hour: null, minute: null, meridiem: null };
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
  clockFormat?: ClockFormat;
}

export function TimePicker({ field, clockFormat }: TimePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const contextFormat = useClockFormat();
  const activeFormat: ClockFormat = clockFormat || contextFormat || "12h";
  const is24h = activeFormat === "24h";

  const { hour, minute, meridiem } = parseTime(field.value, is24h);

  const update = (parts: Partial<TimeParts>) => {
    if (is24h) {
      const nextHour = parts.hour ?? hour ?? "00";
      const nextMinute = parts.minute ?? minute ?? "00";
      field.onChange(`${nextHour}:${nextMinute}`);
    } else {
      const next = {
        hour: parts.hour ?? hour ?? "12",
        minute: parts.minute ?? minute ?? "00",
        meridiem: parts.meridiem ?? meridiem ?? "AM",
      };
      field.onChange(`${next.hour}:${next.minute} ${next.meridiem}`);
    }
  };

  // Stepping past midnight wraps the clock only — the date fields own the day
  const shift = (minutes: number) => {
    const timeFormat = is24h ? "HH:mm" : "hh:mm a";
    const fallback = is24h ? "00:00" : "12:00 AM";
    let baseDate: Date;
    if (typeof field.value === "string" && field.value) {
      let parsed = parse(field.value, "hh:mm a", new Date());
      if (isNaN(parsed.getTime())) {
        parsed = parse(field.value, "HH:mm", new Date());
      }
      baseDate = isNaN(parsed.getTime())
        ? parse(fallback, timeFormat, new Date())
        : parsed;
    } else {
      baseDate = parse(fallback, timeFormat, new Date());
    }
    const stepped = addMinutes(baseDate, minutes);
    field.onChange(format(stepped, timeFormat));
  };

  return (
    <div className="flex md:w-[240px] lg:w-[280px]">
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
            options={is24h ? HOURS_24 : HOURS_12}
            selected={hour}
            onSelect={(value) => update({ hour: value })}
          />
          <TimeColumn
            label="Minute"
            options={MINUTES}
            selected={minute}
            onSelect={(value) => update({ minute: value })}
          />
          {!is24h && (
            <TimeColumn
              label="AM/PM"
              options={MERIDIEMS}
              selected={meridiem}
              onSelect={(value) => update({ meridiem: value })}
            />
          )}
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
