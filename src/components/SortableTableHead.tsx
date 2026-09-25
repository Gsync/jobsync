"use client";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortState } from "@/models/sort.model";

type SortableTableHeadProps<F extends string> = {
  field: F;
  sort: SortState<F> | null;
  onSort: (field: F) => void;
  className?: string;
  children: ReactNode;
};

export function SortableTableHead<F extends string>({
  field,
  sort,
  onSort,
  className,
  children,
}: SortableTableHeadProps<F>) {
  const dir = sort?.field === field ? sort.dir : null;
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <TableHead
      className={className}
      aria-sort={
        dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          dir && "text-foreground",
        )}
      >
        {children}
        <Icon
          className={cn("h-3.5 w-3.5", !dir && "opacity-40")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}
