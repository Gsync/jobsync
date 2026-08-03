"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useAgentChat } from "@/components/agent/AgentChatProvider";

// Complete prompts, not fragments — clicking one fills the composer so it can
// be edited before it costs a 30–60s local generation.
const EXAMPLES = [
  "Add this job posting",
  "Review my resume",
  "Add a job: Senior Platform Engineer at Stripe, remote",
];

export function AgentChatEmptyState() {
  const { preflight, prefillComposer } = useAgentChat();

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

      {preflight.checked && !preflight.ok ? (
        <p className="text-sm text-destructive">{preflight.error}</p>
      ) : (
        <Suggestions>
          {EXAMPLES.map((example) => (
            <Suggestion
              key={example}
              onClick={prefillComposer}
              suggestion={example}
            />
          ))}
        </Suggestions>
      )}
    </div>
  );
}
