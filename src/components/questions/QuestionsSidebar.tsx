"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionTagBadge } from "@/components/questions/QuestionTagBadge";

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
  const sortedTags = [...tags].sort(
    (a, b) => b.questionCount - a.questionCount,
  );

  return (
    <div
      className={cn(
        "relative border-r py-4 hidden md:flex flex-col h-full transition-all duration-200 -ml-3",
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
          <h3 className="font-semibold mb-4 text-sm">Skill Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => onFilterChange(undefined)}>
              <QuestionTagBadge
                variant={!selectedFilter ? "default" : "secondary"}
                className="cursor-pointer"
              >
                {totalQuestions} All
              </QuestionTagBadge>
            </button>
            {sortedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onFilterChange(tag.id)}
                className="max-w-full"
                title={`${tag.questionCount} ${tag.label}`}
              >
                <QuestionTagBadge
                  variant={selectedFilter === tag.id ? "default" : "secondary"}
                  className="cursor-pointer max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {tag.questionCount} {tag.label}
                </QuestionTagBadge>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default QuestionsSidebar;
