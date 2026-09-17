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
} from "react";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchInputProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    clearLabel?: string;
    containerClassName?: string;
    onClear?: () => void;
  } & Omit<ComponentPropsWithoutRef<"input">, "size" | "type" | "onChange">
> & {
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      className,
      containerClassName,
      id,
      label = "Search",
      hint,
      error = false,
      errorMessage = "Enter a valid search term.",
      clearLabel = "Clear search",
      disabled,
      value,
      defaultValue = "",
      placeholder = "Search…",
      onChange,
      onClear,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const localRef = useRef<HTMLInputElement | null>(null);

    const isControlled = value !== undefined;
    const [internal, setInternal] = useState(String(defaultValue));
    const current = isControlled ? String(value) : internal;
    const hasValue = current.length > 0;

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        if (!isControlled) setInternal(next);
        onChange?.(next, event);
      },
      [isControlled, onChange],
    );

    const handleClear = useCallback(() => {
      if (!isControlled) setInternal("");
      onClear?.();
      localRef.current?.focus();
    }, [isControlled, onClear]);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        localRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    useEffect(() => {
      if (isControlled) return;
      const form = localRef.current?.form;
      if (!form) return;
      const handleReset = () => setInternal(String(defaultValue));
      form.addEventListener("reset", handleReset);
      return () => form.removeEventListener("reset", handleReset);
    }, [defaultValue, isControlled]);

    return (
      <div
        data-slot="search-input"
        data-error={error || undefined}
        className={cn("w-full max-w-sm font-sans", containerClassName)}
      >
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>

        <div className="relative">
          <Search
            size={16}
            strokeWidth={2}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
          />

          <input
            ref={setRefs}
            id={inputId}
            type="search"
            role="searchbox"
            disabled={disabled}
            value={current}
            placeholder={placeholder}
            aria-invalid={error || undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            onChange={handleChange}
            className={cn(
              "h-10 w-full rounded-lg border bg-white py-2 pr-10 pl-10 font-sans text-sm text-neutral-900 ring-0 transition-[border-color,background-color] duration-200 outline-none placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
              "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
              error
                ? "border-rose-300 focus:border-rose-400"
                : "border-neutral-200 focus:border-neutral-900",
              className,
            )}
            {...props}
          />

          {hasValue && !disabled ? (
            <button
              type="button"
              aria-label={clearLabel}
              onClick={handleClear}
              className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>

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
  },
);

SearchInput.displayName = "SearchInput";
