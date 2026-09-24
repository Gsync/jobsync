import QuestionsPageClient from "./QuestionsPageClient";
import { getTagsWithQuestionCounts } from "@/actions/question.actions";
import { getAllTags } from "@/actions/tag.actions";
import React from "react";

async function Questions({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const [allTags, tagsWithCounts] = await Promise.all([
    getAllTags(),
    getTagsWithQuestionCounts(stage),
  ]);

  return (
    <QuestionsPageClient
      allTags={allTags || []}
      tagsWithCounts={tagsWithCounts?.data || []}
      totalQuestions={tagsWithCounts?.totalQuestions || 0}
    />
  );
}

export default Questions;
