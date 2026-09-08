"use client";

import type { UseFormReturn } from "react-hook-form";
import { Slider } from "@/components/ui/slider";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateAutomationInput } from "@/models/automation.schema";

export function StepMatching({
  form,
}: {
  form: UseFormReturn<CreateAutomationInput>;
}) {
  return (
    <FormField
      control={form.control}
      name="matchThreshold"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Match Threshold: {field.value}%</FormLabel>
          <FormControl>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[field.value]}
              onValueChange={(value) => field.onChange(value[0])}
            />
          </FormControl>
          <FormDescription>
            Only save listings whose AI match score reaches this threshold.
            Analyzed listings that score below it are discarded — set it lower
            to keep more.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
