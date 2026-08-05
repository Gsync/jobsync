"use client";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "../ui/button";
import { JobsViewMode } from "@/models/job.model";

type JobsViewToggleProps = {
  value: JobsViewMode;
  onChange: (mode: JobsViewMode) => void;
};

export function JobsViewToggle({ value, onChange }: JobsViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5">
      <Button
        size="sm"
        variant={value === "table" ? "secondary" : "ghost"}
        className="h-7 w-7 p-0"
        title="Table view"
        aria-pressed={value === "table"}
        data-testid="jobs-view-table-btn"
        onClick={() => onChange("table")}
      >
        <List className="h-3.5 w-3.5" />
        <span className="sr-only">Table view</span>
      </Button>
      <Button
        size="sm"
        variant={value === "cards" ? "secondary" : "ghost"}
        className="h-7 w-7 p-0"
        title="Card view"
        aria-pressed={value === "cards"}
        data-testid="jobs-view-cards-btn"
        onClick={() => onChange("cards")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="sr-only">Card view</span>
      </Button>
    </div>
  );
}
