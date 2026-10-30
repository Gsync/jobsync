"use client";
import { ReactNode } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

export const SEGMENT_CLASS =
  "h-9 flex-1 whitespace-nowrap rounded-sm px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

export const SEGMENT_CHECKED_CLASS = "bg-muted font-semibold text-foreground";

type SegmentedRadioProps = {
  "aria-label": string;
  options: { value: string; label: string }[];
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
  children?: ReactNode;
};

export function SegmentedRadio({
  "aria-label": ariaLabel,
  options,
  value,
  onValueChange,
  className,
  children,
}: SegmentedRadioProps) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={ariaLabel}
      value={value ?? ""}
      onValueChange={onValueChange}
      className={cn(
        "flex flex-wrap gap-0.5 rounded-md border bg-background p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <RadioGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className={cn(
            SEGMENT_CLASS,
            "data-[state=checked]:bg-muted data-[state=checked]:font-semibold data-[state=checked]:text-foreground",
          )}
        >
          {o.label}
        </RadioGroupPrimitive.Item>
      ))}
      {children}
    </RadioGroupPrimitive.Root>
  );
}
