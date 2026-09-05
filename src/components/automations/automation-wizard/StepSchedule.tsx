"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateAutomationInput } from "@/models/automation.schema";
import { HOURS } from "./wizardConfig";

export function StepSchedule({
  form,
  takenHours,
}: {
  form: UseFormReturn<CreateAutomationInput>;
  takenHours: Set<number>;
}) {
  return (
    <FormField
      control={form.control}
      name="scheduleHour"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Daily Run Time</FormLabel>
          <Select
            onValueChange={(val) => {
              field.onChange(parseInt(val));
              form.clearErrors("scheduleHour");
            }}
            value={field.value.toString()}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour.value} value={hour.value.toString()}>
                  {hour.label}
                  {takenHours.has(hour.value) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      In use
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            The automation will run daily at this time (server timezone)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
