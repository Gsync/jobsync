import QuestionsPageClient from "./QuestionsPageClient";
import { getTagsWithQuestionCounts } from "@/actions/question.actions";
import { getAllTags } from "@/actions/tag.actions";
import React from "react";

async function Questions() {
  const [allTags, tagsWithCounts] = await Promise.all([
    getAllTags(),
    getTagsWithQuestionCounts(),
  ]);

  return (
    <QuestionsPageClient
      allTags={allTags || []}
      tagsWithCounts={(tagsWithCounts?.data as any) || []}
      totalQuestions={tagsWithCounts?.total || 0}
    />
  );
}

export default Questions;
