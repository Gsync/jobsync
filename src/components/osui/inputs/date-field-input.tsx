"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MutableRefObject,
  type Ref,
} from "react";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type DateFieldInputProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    placeholder?: string;
    containerClassName?: string;
    openPickerLabel?: string;
    name?: string;
    required?: boolean;
    onValueChange?: (value: string) => void;
  } & Omit<
    ComponentPropsWithoutRef<"button">,
    "size" | "type" | "value" | "defaultValue" | "onChange" | "children"
  >
> & {
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function isDisabledDay(day: Date, min?: string, max?: string): boolean {
  const minDate = min ? parseIsoDate(min) : null;
  const maxDate = max ? parseIsoDate(max) : null;
  const time = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
  ).getTime();
  if (minDate && time < minDate.getTime()) return true;
  if (maxDate && time > maxDate.getTime()) return true;
  return false;
}

export const DateFieldInput = forwardRef<
  HTMLButtonElement,
  DateFieldInputProps
>(function DateFieldInput(
  {
    className,
    containerClassName,
    id,
    label = "Date of birth",
    hint,
    error = false,
    errorMessage = "Enter a valid date.",
    placeholder = "Select a date",
    openPickerLabel = "Open calendar",
    disabled,
    required,
    name,
    value,
    defaultValue = "",
    min,
    max,
    onChange,
    onValueChange,
    onClick,
    onBlur,
    onKeyDown,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const calendarId = `${fieldId}-calendar`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const today = useMemo(() => new Date(), []);

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(String(defaultValue));
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = parseIsoDate(
      isControlled ? String(value ?? "") : String(defaultValue),
    );
    return startOfMonth(initial ?? today);
  });

  const current = isControlled ? String(value ?? "") : internal;
  const selectedDate = parseIsoDate(current);
  const hasValue = current.length > 0;
  const monthDays = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const emitChange = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
      onChange?.({ target: { value: next } } as ChangeEvent<HTMLInputElement>);
    },
    [isControlled, onChange, onValueChange],
  );

  const close = useCallback(() => setOpen(false), []);

  const selectDay = useCallback(
    (day: Date) => {
      if (isDisabledDay(day, min, max)) return;
      const next = toIsoDate(day);
      emitChange(next);
      close();
      triggerRef.current?.focus();
    },
    [close, emitChange, max, min],
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, open]);

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        if (!open) {
          if (selectedDate) setViewMonth(startOfMonth(selectedDate));
          setOpen(true);
        }
      }
    },
    [disabled, onKeyDown, open, selectedDate],
  );

  return (
    <div
      ref={rootRef}
      data-slot="date-field-input"
      data-error={error || undefined}
      data-open={open || undefined}
      className={cn("relative w-full max-w-sm font-sans", containerClassName)}
    >
      <input
        type="text"
        name={name}
        value={current}
        disabled={disabled}
        required={required}
        aria-invalid={error || undefined}
        tabIndex={-1}
        aria-hidden
        onInvalid={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        className="sr-only"
        readOnly
      />

      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-sm font-medium text-neutral-900"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      <button
        ref={mergeRefs(ref, triggerRef)}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={calendarId}
        aria-label={`${openPickerLabel}: ${label}`}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          if (open) close();
          else {
            if (selectedDate) setViewMonth(startOfMonth(selectedDate));
            setOpen(true);
          }
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (event.defaultPrevented) return;
          window.requestAnimationFrame(() => {
            if (!rootRef.current?.contains(document.activeElement)) close();
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3.5 text-left font-sans text-sm ring-0 transition-[border-color] duration-200 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
          hasValue ? "text-neutral-900" : "text-neutral-400",
          error
            ? "border-rose-300 focus:border-rose-400"
            : open
              ? "border-neutral-900"
              : "border-neutral-200 focus:border-neutral-900",
          className,
        )}
        {...props}
      >
        <span className="truncate">
          {hasValue ? formatDisplayDate(current) : placeholder}
        </span>
        <Calendar
          size={16}
          strokeWidth={2}
          aria-hidden
          className="shrink-0 text-neutral-400"
        />
      </button>

      {open ? (
        <div
          id={calendarId}
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute z-20 mt-1.5 w-full rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900">
              {monthLabel}
            </p>
            <div className="flex gap-0.5">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewMonth((prev) => addMonths(prev, -1))}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <ChevronLeft size={14} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth((prev) => addMonths(prev, 1))}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <ChevronRight size={14} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10px] font-medium tracking-wide text-neutral-400 uppercase"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const isSelected = selectedDate
                ? isSameDay(day, selectedDate)
                : false;
              const isToday = isSameDay(day, today);
              const isDisabled = isDisabledDay(day, min, max);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  aria-label={day.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  aria-pressed={isSelected}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex h-9 cursor-pointer items-center justify-center rounded-lg text-sm ring-0 transition-colors duration-150 outline-none focus:ring-0",
                    !inMonth && "text-neutral-300",
                    inMonth &&
                      !isSelected &&
                      !isDisabled &&
                      "text-neutral-700 hover:bg-neutral-50",
                    isToday &&
                      !isSelected &&
                      inMonth &&
                      "font-semibold text-neutral-900",
                    isSelected &&
                      "bg-neutral-900 font-medium text-white hover:bg-neutral-800",
                    isDisabled &&
                      "cursor-not-allowed text-neutral-300 hover:bg-transparent",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={() => {
                if (!isDisabledDay(today, min, max)) selectDay(today);
              }}
              disabled={isDisabledDay(today, min, max)}
              className="cursor-pointer text-xs font-medium text-neutral-700 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline disabled:cursor-not-allowed disabled:text-neutral-300"
            >
              Today
            </button>

            {hasValue ? (
              <button
                type="button"
                onClick={() => {
                  emitChange("");
                  close();
                }}
                className="cursor-pointer text-xs font-medium text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600">
          {errorMessage}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

DateFieldInput.displayName = "DateFieldInput";
