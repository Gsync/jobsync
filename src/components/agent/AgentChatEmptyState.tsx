"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { AGENT_ADD_JOB_INTRO } from "@/lib/agent/prompt";

// None need editing first, so they act on click. "Review resume" runs a real
// turn. "Match a job" and "Generate cover letter" have no page context here,
// so the tools reply with a graceful "no_job" result telling the user to open
// a job's page first. ADD_JOB is the one whose answer is knowable without the
// model — see AGENT_ADD_JOB_INTRO.
const ADD_JOB = "Add a job posting";
const EXAMPLES = [
  ADD_JOB,
  "Review resume",
  "Match a job",
  "Generate cover letter",
];

export function AgentChatEmptyState() {
  const { sendMessage, seedExchange, preflight } = useAgentChat();

  const handleClick = (example: string) => {
    if (!preflight.ok) return;
    if (example === ADD_JOB) {
      seedExchange(example, AGENT_ADD_JOB_INTRO);
      return;
    }
    void sendMessage({ parts: [{ type: "text", text: example }] });
  };

  return (
    <div className="flex flex-1 flex-col justify-end gap-4 p-4">
      {/* Stated up front rather than left to the model to confess: a local 8B
          asked what it can do will happily invent capabilities. */}
      <p className="text-sm text-muted-foreground">
        I can add a job to your tracker — paste a posting, paste a link to it,
        or type the details, and I&apos;ll show you what I extracted before
        anything is saved. I can also read and review your resumes, and while
        you&apos;re looking at a job I can score how well one of them matches it
        or write you a cover letter. I can&apos;t search your existing jobs or
        read your tasks yet.
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
