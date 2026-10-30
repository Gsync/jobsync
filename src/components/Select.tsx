import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { FormControl } from "./ui/form";
import { ControllerRenderProps } from "react-hook-form";
import { cn } from "@/lib/utils";

interface SelectProps {
  label: string;
  options: any[];
  field: ControllerRenderProps<any, any>;
  fullWidth?: boolean;
}

function SelectFormCtrl({ label, options, field, fullWidth }: SelectProps) {
  return (
    <>
      <Select
        onValueChange={field.onChange}
        value={field.value}
        name={field.name}
      >
        <FormControl>
          <SelectTrigger
            aria-label={`Select ${label}`}
            className={cn(
              fullWidth ? "w-full" : "w-[200px]",
              "[&_[data-incomplete-hint]]:pointer-events-none",
            )}
          >
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectGroup>
            {options &&
              options.map((option) => {
                return (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    disabled={option.disabled}
                  >
                    {option.label ?? option.value ?? option.title}
                    {option.suffix}
                  </SelectItem>
                );
              })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
}

export default SelectFormCtrl;
