"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

export type SwitchFieldInputProps = Readonly<
  {
    label?: string;
    hint?: string;
    error?: boolean;
    errorMessage?: string;
    containerClassName?: string;
    onCheckedChange?: (checked: boolean) => void;
  } & Omit<
    ComponentPropsWithoutRef<"button">,
    "size" | "type" | "role" | "onChange" | "defaultChecked"
  >
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
};

export const SwitchFieldInput = forwardRef<
  HTMLButtonElement,
  SwitchFieldInputProps
>(function SwitchFieldInput(
  {
    className,
    containerClassName,
    id,
    label = "Email notifications",
    hint = "Receive product updates and release notes.",
    error = false,
    errorMessage = "This setting is required.",
    disabled = false,
    required,
    checked,
    defaultChecked = false,
    name,
    onCheckedChange,
    onClick,
    onKeyDown,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const hintId = `${switchId}-hint`;
  const errorId = `${switchId}-error`;

  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = isControlled ? checked : internal;

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !isOn;
    if (!isControlled) setInternal(next);
    onCheckedChange?.(next);
  }, [disabled, isControlled, isOn, onCheckedChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    },
    [disabled, onKeyDown, toggle],
  );

  return (
    <div
      data-slot="switch-field-input"
      data-error={error || undefined}
      data-checked={isOn || undefined}
      className={cn("w-full max-w-sm font-sans", containerClassName)}
    >
      {name || required ? (
        <input
          type="checkbox"
          name={name}
          value="on"
          checked={isOn}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            event.currentTarget.parentElement
              ?.querySelector<HTMLButtonElement>('[role="switch"]')
              ?.focus();
          }}
          className="sr-only"
        />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            id={`${switchId}-label`}
            className="text-sm font-medium text-neutral-900"
          >
            {label}
            {required ? (
              <span className="ml-0.5 text-rose-500" aria-hidden>
                *
              </span>
            ) : null}
          </p>
          {hint ? (
            <p id={hintId} className="mt-0.5 text-xs text-neutral-500">
              {hint}
            </p>
          ) : null}
        </div>

        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          disabled={disabled}
          aria-checked={isOn}
          aria-required={required || undefined}
          aria-invalid={error || undefined}
          aria-labelledby={`${switchId}-label`}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) toggle();
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 ring-0 transition-[background-color,border-color] duration-200 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
            isOn
              ? "border-neutral-900 bg-neutral-900"
              : "border-neutral-200 bg-neutral-100",
            error && !isOn && "border-rose-300 bg-rose-50",
            className,
          )}
          {...props}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform duration-200",
              isOn && "translate-x-5",
            )}
          />
        </button>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
});

SwitchFieldInput.displayName = "SwitchFieldInput";
