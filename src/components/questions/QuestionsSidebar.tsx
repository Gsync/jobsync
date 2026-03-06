"use client";
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
  return (
    <div className="w-48 border-r py-4 hidden md:block h-full">
      <h3 className="font-semibold mb-4 text-sm">Skill Tags</h3>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onFilterChange(undefined)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              !selectedFilter && "bg-accent text-accent-foreground font-medium"
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
                  "bg-accent text-accent-foreground font-medium"
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
    </div>
  );
}

export default QuestionsSidebar;
