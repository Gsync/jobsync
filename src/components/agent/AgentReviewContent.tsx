"use client";

import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { AgentReviewScoreCard } from "@/components/agent/AgentReviewScoreCard";
import type { ResumeScores } from "@/models/ai.schemas";

// One renderer for both phases of a review: the transient token stream while
// review_resume runs, and the structured tool output once it returns. Using
// two would let the handoff visibly change the layout mid-turn.
export function AgentReviewContent({
  scores,
  body,
}: {
  scores?: ResumeScores;
  body: string;
}) {
  return (
    <>
      {scores && <AgentReviewScoreCard scores={scores} />}
      <AgentMarkdown text={body} />
    </>
  );
}
