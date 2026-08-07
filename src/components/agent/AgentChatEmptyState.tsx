"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useAgentChat } from "@/components/agent/AgentChatProvider";

// Both send immediately on click — neither needs editing first. "Add this
// job posting" has no company/title yet, so the model asks the user to
// paste it rather than calling add_job.
const EXAMPLES = ["Add a job posting", "Review resume"];

export function AgentChatEmptyState() {
  const { sendMessage, preflight } = useAgentChat();

  const handleClick = (example: string) => {
    if (!preflight.ok) return;
    void sendMessage({ parts: [{ type: "text", text: example }] });
  };

  return (
    <div className="flex flex-1 flex-col justify-end gap-4 p-4">
      {/* Stated up front rather than left to the model to confess: a local 8B
          asked what it can do will happily invent capabilities. */}
      <p className="text-sm text-muted-foreground">
        I can add a job to your tracker — paste a posting or type the details,
        and I&apos;ll show you what I extracted before anything is saved. I can
        also read and review your resumes. I can&apos;t read your existing jobs
        or tasks yet.
      </p>

      <Suggestions>
        {EXAMPLES.map((example) => (
          <Suggestion
            disabled={!preflight.ok}
            key={example}
            onClick={handleClick}
            suggestion={example}
          />
        ))}
      </Suggestions>
    </div>
  );
}
