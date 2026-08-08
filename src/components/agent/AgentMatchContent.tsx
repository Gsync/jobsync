"use client";

import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { AgentMatchScoreCard } from "@/components/agent/AgentMatchScoreCard";
import type { JobMatchScores } from "@/models/ai.schemas";

// One renderer for both phases of a match: the transient token stream while
// match_job runs, and the structured tool output once it returns. Using two
// would let the handoff visibly change the layout mid-turn.
export function AgentMatchContent({
  scores,
  body,
}: {
  scores?: JobMatchScores;
  body: string;
}) {
  return (
    <>
      {scores && <AgentMatchScoreCard scores={scores} />}
      <AgentMarkdown text={body} />
    </>
  );
}
