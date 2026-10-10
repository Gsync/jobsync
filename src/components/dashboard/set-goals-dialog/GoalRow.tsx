import type { Control } from "react-hook-form";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GoalTargets } from "@/models/dailyGoals.model";

interface GoalRowProps {
  control: Control<GoalTargets>;
  name: keyof GoalTargets;
  label: string;
  noun: string;
  ring: string;
  min: number;
  max: number;
  previous: number;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export default function GoalRow({
  control,
  name,
  label,
  noun,
  ring,
  min,
  max,
  previous,
}: GoalRowProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = field.value;
        const changed = !fieldState.error && value !== previous;
        // A cleared field (NaN) steps from the minimum
        const step = (delta: number) =>
          field.onChange(
            Number.isNaN(value)
              ? min
              : clamp(Math.round(value) + delta, min, max),
          );
        return (
          <FormItem
            className={cn(
              "flex items-center gap-3 space-y-0 rounded-lg border p-3 pl-4",
              fieldState.error && "border-destructive",
              changed && "border-primary/40",
            )}
          >
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full border-[3px]"
              style={{ borderColor: ring }}
            />
            <div className="flex grow flex-col gap-0.5">
              <FormLabel>{label}</FormLabel>
              {fieldState.error ? (
                <FormMessage className="text-xs" />
              ) : changed ? (
                <span className="text-xs font-medium text-primary">
                  Was {previous} · now {value}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {min} to {max}
                </span>
              )}
            </div>
            <div className="flex items-center overflow-hidden rounded-md border">
              <Button
                type="button"
                variant="ghost"
                className="size-11 rounded-none"
                aria-label={`Fewer ${noun}`}
                disabled={value <= min}
                onClick={() => step(-1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1}
                  className="h-11 w-14 rounded-none border-0 border-x text-center text-base font-semibold"
                  {...field}
                  value={Number.isNaN(value) ? "" : value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <Button
                type="button"
                variant="ghost"
                className="size-11 rounded-none"
                aria-label={`More ${noun}`}
                disabled={value >= max}
                onClick={() => step(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormItem>
        );
      }}
    />
  );
}
