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
import { Job } from "@/models/job.model";

interface SelectProps {
  label: string;
  options: any[];
  field: ControllerRenderProps<Job, any>;
  dataKey: string;
}

function SelectFormCtrl({ label, options, field, dataKey }: SelectProps) {
  return (
    <>
      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
        name={field.name}
      >
        <FormControl>
          <SelectTrigger aria-label={`Select ${label}`} className="w-[200px]">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => {
              return (
                <SelectItem
                  key={option.id}
                  value={option[dataKey]}
                  className="capitalize"
                >
                  {option[dataKey]}
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
