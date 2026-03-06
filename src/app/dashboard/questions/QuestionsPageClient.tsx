"use client";
import QuestionsContainer from "@/components/questions/QuestionsContainer";
import QuestionsSidebar from "@/components/questions/QuestionsSidebar";
import { Tag } from "@/models/job.model";
import { useState, useCallback } from "react";
import { getTagsWithQuestionCounts } from "@/actions/question.actions";

type TagWithCount = {
  id: string;
  label: string;
  value: string;
  questionCount: number;
};

type QuestionsPageClientProps = {
  allTags: Tag[];
  tagsWithCounts: TagWithCount[];
  totalQuestions: number;
};

function QuestionsPageClient({
  allTags,
  tagsWithCounts,
  totalQuestions,
}: QuestionsPageClientProps) {
  const [filterKey, setFilterKey] = useState<string | undefined>(undefined);
  const [sidebarCounts, setSidebarCounts] =
    useState<TagWithCount[]>(tagsWithCounts);
  const [sidebarTotal, setSidebarTotal] = useState<number>(totalQuestions);

  const onFilterChange = (filter: string | undefined) => {
    setFilterKey(filter);
  };

  const refreshSidebarCounts = useCallback(async () => {
    const result = await getTagsWithQuestionCounts();
    if (result?.success) {
      setSidebarCounts(result.data);
      setSidebarTotal(result.totalQuestions);
    }
  }, []);

  return (
    <div className="col-span-3 flex h-full">
      <QuestionsSidebar
        tags={sidebarCounts}
        totalQuestions={sidebarTotal}
        selectedFilter={filterKey}
        onFilterChange={onFilterChange}
      />
      <div className="flex-1">
        <QuestionsContainer
          availableTags={allTags}
          filterKey={filterKey}
          onQuestionsChanged={refreshSidebarCounts}
        />
      </div>
    </div>
  );
}

export default QuestionsPageClient;
