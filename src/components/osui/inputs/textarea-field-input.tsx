"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";

export type TextareaFieldInputProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    showCount?: boolean;
    containerClassName?: string;
  } & Omit<ComponentPropsWithoutRef<"textarea">, "onChange">
> & {
  onChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
};

export const TextareaFieldInput = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldInputProps
>(function TextareaFieldInput(
  {
    className,
    containerClassName,
    id,
    label = "Message",
    hint,
    error = false,
    errorMessage = "Message is too long.",
    showCount = true,
    disabled,
    required,
    value,
    defaultValue = "",
    maxLength = 500,
    rows = 4,
    onChange,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const countId = `${inputId}-count`;

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(String(defaultValue));
  const current = isControlled ? String(value) : internal;
  const length = current.length;
  const safeMaxLength =
    maxLength === undefined
      ? undefined
      : Number.isFinite(maxLength)
        ? Math.max(0, Math.floor(maxLength))
        : 500;
  const atLimit = safeMaxLength !== undefined && length >= safeMaxLength;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      if (!isControlled) setInternal(next);
      onChange?.(next, event);
    },
    [isControlled, onChange],
  );

  return (
    <div
      data-slot="textarea-field-input"
      data-error={error || undefined}
      className={cn("w-full max-w-sm font-sans", containerClassName)}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-900"
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-rose-500" aria-hidden>
              *
            </span>
          ) : null}
        </label>

        {showCount && safeMaxLength !== undefined ? (
          <span
            id={countId}
            className={cn(
              "text-xs text-neutral-400 tabular-nums",
              atLimit && "text-amber-600",
            )}
          >
            {length}/{safeMaxLength}
          </span>
        ) : null}
      </div>

      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        disabled={disabled}
        required={required}
        value={current}
        maxLength={safeMaxLength}
        aria-invalid={error || undefined}
        aria-describedby={
          [
            error ? errorId : null,
            hint ? hintId : null,
            showCount && safeMaxLength !== undefined ? countId : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={handleChange}
        className={cn(
          "min-h-24 w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 font-sans text-sm leading-relaxed text-neutral-900 ring-0 transition-[border-color,background-color] duration-200 outline-none placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
          error
            ? "border-rose-300 focus:border-rose-400"
            : "border-neutral-200 focus:border-neutral-900",
          className,
        )}
        {...props}
      />

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

TextareaFieldInput.displayName = "TextareaFieldInput";
