"use client";

import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type InputGroupFieldProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    prefix?: ReactNode;
    suffix?: ReactNode;
    containerClassName?: string;
  } & Omit<ComponentPropsWithoutRef<"input">, "size">
>;

export const InputGroupField = forwardRef<
  HTMLInputElement,
  InputGroupFieldProps
>(function InputGroupField(
  {
    className,
    containerClassName,
    id,
    label = "Website",
    hint = "Include the path after your domain.",
    error = false,
    errorMessage = "Enter a valid URL.",
    prefix = "https://",
    suffix,
    disabled,
    required,
    type = "text",
    placeholder = "yoursite.com",
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div
      data-slot="input-group-field"
      data-error={error || undefined}
      className={cn("w-full max-w-sm font-sans", containerClassName)}
    >
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-medium text-neutral-900"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      <div
        className={cn(
          "flex overflow-hidden rounded-lg border bg-white transition-[border-color] duration-200",
          error
            ? "border-rose-300 focus-within:border-rose-400"
            : "border-neutral-200 focus-within:border-neutral-900",
          disabled && "bg-neutral-50",
        )}
      >
        {prefix ? (
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center border-r border-neutral-200 bg-neutral-50 px-3 font-mono text-sm text-neutral-500",
              disabled && "text-neutral-400",
            )}
          >
            {prefix}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-invalid={error || undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "h-10 min-w-0 flex-1 bg-transparent px-3.5 font-sans text-sm text-neutral-900 ring-0 outline-none placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:text-neutral-400",
            className,
          )}
          {...props}
        />

        {suffix ? (
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center border-l border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500",
              disabled && "text-neutral-400",
            )}
          >
            {suffix}
          </span>
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
});

InputGroupField.displayName = "InputGroupField";
