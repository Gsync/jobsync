"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { APP_CONSTANTS } from "@/lib/constants";

type RecordsPerPageSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

export function RecordsPerPageSelector({
  value,
  onChange,
}: RecordsPerPageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Records per page</span>
      <Select
        value={String(value)}
        onValueChange={(val) => onChange(Number(val))}
      >
        <SelectTrigger className="w-[70px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APP_CONSTANTS.RECORDS_PER_PAGE_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
