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

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxFieldOption = Readonly<{
  value: string;
  label: string;
  disabled?: boolean;
}>;

export type ComboboxFieldInputProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    placeholder?: string;
    emptyMessage?: string;
    options?: readonly ComboboxFieldOption[];
    containerClassName?: string;
    name?: string;
    onValueChange?: (value: string) => void;
  } & Omit<
    ComponentPropsWithoutRef<"input">,
    "size" | "type" | "value" | "defaultValue" | "onChange" | "role"
  >
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const DEFAULT_OPTIONS: readonly ComboboxFieldOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "angular", label: "Angular" },
  { value: "solid", label: "Solid" },
  { value: "next", label: "Next.js" },
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
  options: readonly ComboboxFieldOption[],
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

export const ComboboxFieldInput = forwardRef<
  HTMLInputElement,
  ComboboxFieldInputProps
>(function ComboboxFieldInput(
  {
    className,
    containerClassName,
    id,
    label = "Framework",
    hint,
    error = false,
    errorMessage = "Select a valid option.",
    placeholder = "Search frameworks…",
    emptyMessage = "No results found.",
    options = DEFAULT_OPTIONS,
    disabled,
    required,
    name,
    value,
    defaultValue = "",
    onChange,
    onValueChange,
    onFocus,
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const currentValue = isControlled ? String(value ?? "") : internalValue;
  const selectedOption = options.find(
    (option) => option.value === currentValue,
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const displayValue = open ? query : (selectedOption?.label ?? query);

  const emitChange = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
      onChange?.({ target: { value: next } } as ChangeEvent<HTMLInputElement>);
    },
    [isControlled, onChange, onValueChange],
  );

  const close = useCallback(() => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setOpen(false);
    setHighlighted(-1);
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    const index = filtered.findIndex((option) => option.value === currentValue);
    if (index >= 0 && !filtered[index]?.disabled) {
      setHighlighted(index);
      return;
    }
    const firstEnabled = filtered.findIndex((option) => !option.disabled);
    setHighlighted(firstEnabled);
  }, [currentValue, disabled, filtered]);

  const selectOption = useCallback(
    (option: ComboboxFieldOption) => {
      if (option.disabled) return;
      emitChange(option.value);
      setQuery(option.label);
      setOpen(false);
      setHighlighted(-1);
    },
    [emitChange],
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, open]);

  useEffect(() => {
    if (disabled && open) close();
  }, [close, disabled, open]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !currentValue ? errorMessage : "",
    );
  }, [currentValue, errorMessage, required]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null)
        window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (highlighted >= filtered.length) {
      const firstEnabled = filtered.findIndex((option) => !option.disabled);
      setHighlighted(firstEnabled);
    }
  }, [filtered, highlighted, open]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextQuery = event.target.value;
      setQuery(nextQuery);
      setOpen(true);
      const normalized = nextQuery.trim().toLowerCase();
      const nextOptions = normalized
        ? options.filter((option) =>
            option.label.toLowerCase().includes(normalized),
          )
        : options;
      setHighlighted(nextOptions.findIndex((option) => !option.disabled));
      if (!nextQuery.trim()) emitChange("");
    },
    [emitChange, options],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const next = findNextEnabledIndex(
          filtered,
          highlighted < 0 ? -1 : highlighted,
          1,
        );
        if (next >= 0) setHighlighted(next);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const next = findNextEnabledIndex(
          filtered,
          highlighted < 0 ? filtered.length : highlighted,
          -1,
        );
        if (next >= 0) setHighlighted(next);
        return;
      }

      if (event.key === "Enter" && open && highlighted >= 0) {
        event.preventDefault();
        const option = filtered[highlighted];
        if (option) selectOption(option);
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    },
    [
      close,
      disabled,
      filtered,
      highlighted,
      onKeyDown,
      open,
      openList,
      selectOption,
    ],
  );

  return (
    <div
      ref={rootRef}
      data-slot="combobox-field-input"
      data-error={error || undefined}
      data-open={open || undefined}
      className={cn("relative w-full max-w-sm font-sans", containerClassName)}
    >
      {name ? (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          disabled={disabled}
          readOnly
        />
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

      <div className="relative">
        <input
          ref={mergeRefs(ref, inputRef)}
          id={fieldId}
          type="text"
          role="combobox"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={displayValue}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && highlighted >= 0
              ? `${listboxId}-option-${highlighted}`
              : undefined
          }
          aria-invalid={error || undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          onChange={handleInputChange}
          onFocus={(event) => {
            onFocus?.(event);
            if (!disabled) openList();
          }}
          onBlur={(event) => {
            onBlur?.(event);
            if (event.defaultPrevented) return;
            blurTimerRef.current = window.setTimeout(() => close(), 120);
          }}
          onInvalid={() => {
            inputRef.current?.focus();
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-10 w-full rounded-lg border bg-white py-2 pr-10 pl-3.5 font-sans text-sm text-neutral-900 ring-0 transition-[border-color] duration-200 outline-none placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
            error
              ? "border-rose-300 focus:border-rose-400"
              : open
                ? "border-neutral-900"
                : "border-neutral-200 focus:border-neutral-900",
            className,
          )}
          {...props}
        />

        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </div>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-sm"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-neutral-400">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === currentValue;
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
                  onClick={() => selectOption(option)}
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
            })
          )}
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

ComboboxFieldInput.displayName = "ComboboxFieldInput";
