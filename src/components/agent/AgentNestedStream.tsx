import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { AgentMatchContent } from "@/components/agent/AgentMatchContent";
import { AgentReviewContent } from "@/components/agent/AgentReviewContent";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";
import { parseResumeReview } from "@/lib/ai/resumeReview/parse";
import { stripThinking } from "@/lib/ai/stripThinking";

export function ReviewResumeStream({ text }: { text: string }) {
  const { body, scores } = parseResumeReview(text);
  return <AgentReviewContent body={body} scores={scores} />;
}

export function MatchJobStream({ text }: { text: string }) {
  const { body, scores } = parseJobMatch(text);
  return <AgentMatchContent body={body} scores={scores} />;
}

export function CoverLetterStream({ text }: { text: string }) {
  return <AgentMarkdown text={stripThinking(text)} />;
}
