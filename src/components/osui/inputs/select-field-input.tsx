"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MutableRefObject,
  type Ref,
} from "react";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectFieldOption = Readonly<{
  value: string;
  label: string;
  disabled?: boolean;
}>;

export type SelectFieldInputProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    placeholder?: string;
    options?: readonly SelectFieldOption[];
    containerClassName?: string;
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
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

const DEFAULT_OPTIONS: readonly SelectFieldOption[] = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
];

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

function findNextEnabledIndex(
  options: readonly SelectFieldOption[],
  start: number,
  direction: 1 | -1,
): number {
  const count = options.length;
  if (count === 0) return -1;

  for (let step = 1; step <= count; step += 1) {
    const index = (start + direction * step + count) % count;
    if (!options[index]?.disabled) return index;
  }

  return -1;
}

export const SelectFieldInput = forwardRef<
  HTMLButtonElement,
  SelectFieldInputProps
>(function SelectFieldInput(
  {
    className,
    containerClassName,
    id,
    label = "Country",
    hint,
    error = false,
    errorMessage = "Please select an option.",
    placeholder = "Select an option",
    options = DEFAULT_OPTIONS,
    disabled,
    required,
    name,
    value,
    defaultValue = "",
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
  const listboxId = `${fieldId}-listbox`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(String(defaultValue));
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const current = isControlled ? String(value ?? "") : internal;
  const selectedOption = options.find((option) => option.value === current);
  const hasValue = current.length > 0;

  const emitChange = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
      onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>);
    },
    [isControlled, onChange, onValueChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlighted(-1);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    const selectedIndex = options.findIndex(
      (option) => option.value === current,
    );
    if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) {
      setHighlighted(selectedIndex);
      return;
    }
    const firstEnabled = options.findIndex((option) => !option.disabled);
    setHighlighted(firstEnabled);
  }, [current, disabled, options]);

  const selectAt = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      emitChange(option.value);
      close();
      triggerRef.current?.focus();
    },
    [close, emitChange, options],
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
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
      }

      if (!open) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = findNextEnabledIndex(
          options,
          highlighted < 0 ? -1 : highlighted,
          1,
        );
        if (next >= 0) setHighlighted(next);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const next = findNextEnabledIndex(
          options,
          highlighted < 0 ? options.length : highlighted,
          -1,
        );
        if (next >= 0) setHighlighted(next);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        const next = findNextEnabledIndex(options, -1, 1);
        if (next >= 0) setHighlighted(next);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        const next = findNextEnabledIndex(options, options.length, -1);
        if (next >= 0) setHighlighted(next);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (highlighted >= 0) selectAt(highlighted);
      }
    },
    [disabled, highlighted, onKeyDown, open, openList, options, selectAt],
  );

  return (
    <div
      ref={rootRef}
      data-slot="select-field-input"
      data-error={error || undefined}
      data-open={open || undefined}
      className={cn("relative w-full max-w-sm font-sans", containerClassName)}
    >
      {name || required ? (
        <select
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          aria-invalid={error || undefined}
          tabIndex={-1}
          aria-hidden
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="sr-only"
        >
          <option value="" />
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && highlighted >= 0
            ? `${listboxId}-option-${highlighted}`
            : undefined
        }
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          if (open) close();
          else openList();
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
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "shrink-0 text-neutral-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-sm"
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            const isHighlighted = index === highlighted;

            return (
              <li
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => {
                  if (!option.disabled) setHighlighted(index);
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectAt(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm transition-colors duration-150",
                  option.disabled && "cursor-not-allowed text-neutral-300",
                  !option.disabled &&
                    isHighlighted &&
                    "bg-neutral-50 text-neutral-900",
                  !option.disabled && !isHighlighted && "text-neutral-700",
                  isSelected &&
                    !option.disabled &&
                    "font-medium text-neutral-900",
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    className="shrink-0 text-neutral-900"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
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

SelectFieldInput.displayName = "SelectFieldInput";
