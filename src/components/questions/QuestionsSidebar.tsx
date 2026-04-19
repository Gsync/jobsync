"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TagWithCount = {
  id: string;
  label: string;
  value: string;
  questionCount: number;
};

type QuestionsSidebarProps = {
  tags: TagWithCount[];
  totalQuestions: number;
  selectedFilter?: string;
  onFilterChange: (filter: string | undefined) => void;
};

function QuestionsSidebar({
  tags,
  totalQuestions,
  selectedFilter,
  onFilterChange,
}: QuestionsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "relative border-r py-4 hidden md:flex flex-col h-full transition-all duration-200",
        collapsed ? "w-0 overflow-visible" : "w-48",
      )}
    >
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -right-3 top-4 z-10 flex items-center justify-center w-6 h-6 rounded-full border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {!collapsed && (
        <>
          <h3 className="font-semibold mb-4 text-sm px-1">Skill Tags</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => onFilterChange(undefined)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  !selectedFilter &&
                    "bg-accent text-accent-foreground font-medium",
                )}
              >
                <span className="flex justify-between items-center">
                  <span>All</span>
                  <span className="text-muted-foreground text-xs">
                    {totalQuestions}
                  </span>
                </span>
              </button>
            </li>
            {tags.map((tag) => (
              <li key={tag.id}>
                <button
                  onClick={() => onFilterChange(tag.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedFilter === tag.id &&
                      "bg-accent text-accent-foreground font-medium",
                  )}
                >
                  <span className="flex justify-between items-center">
                    <span className="truncate">{tag.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {tag.questionCount}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default QuestionsSidebar;
