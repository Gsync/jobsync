"use client";

import { NoResumesNotice } from "@/components/agent/AgentResultCard/NoResumesNotice";
import { ResumeSelectionPrompt } from "@/components/agent/AgentResultCard/ResumeSelectionPrompt";
import type { AgentGetResumeResult } from "@/models/agent.model";

// The resume text itself is never rendered: the user is about to read the
// review, not the serialization, and the card would be a wall of text.
export function GetResumeResult({ output }: { output: AgentGetResumeResult }) {
  if (output.status === "no_resumes") {
    return <NoResumesNotice />;
  }

  if (output.status === "unreadable") {
    return (
      <p className="text-sm">
        Couldn&apos;t read <strong>{output.title}</strong> — {output.reason}
      </p>
    );
  }

  if (output.status === "needs_selection") {
    return (
      <ResumeSelectionPrompt
        prompt="Which resume?"
        resumes={output.resumes}
        messageFor={(title) => `Use my resume "${title}"`}
      />
    );
  }

  const sourceNote =
    output.source === "default"
      ? " (your default)"
      : output.source === "page"
        ? " (the one you're viewing)"
        : "";

  return (
    <div className="text-sm">
      <p>
        Read <strong>{output.title}</strong>
        {sourceNote}.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {output.chars.toLocaleString()} characters
        {output.truncated ? " · truncated" : ""}
        {output.ambiguousTitle ? " · more than one resume has this title" : ""}
      </p>
    </div>
  );
}
