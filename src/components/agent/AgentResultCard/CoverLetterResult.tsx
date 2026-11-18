"use client";

import Link from "next/link";
import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { NoResumesNotice } from "@/components/agent/AgentResultCard/NoResumesNotice";
import { ResumeSelectionPrompt } from "@/components/agent/AgentResultCard/ResumeSelectionPrompt";
import type { AgentCoverLetterResult } from "@/models/agent.model";

// The letter comes from the tool output, not from the streamed text: the
// stream is a progress indicator and the output is what was saved.
export function CoverLetterResult({ output }: { output: AgentCoverLetterResult }) {
  if (output.status === "no_job") {
    return (
      <p className="text-sm">
        Open the job you want a letter for first — I write for the job
        you&apos;re looking at.
      </p>
    );
  }

  if (output.status === "no_description") {
    return (
      <p className="text-sm">
        <strong>{output.jobTitle}</strong> has no real description yet. Add the
        posting and I can write a letter from it.
      </p>
    );
  }

  if (output.status === "no_resumes") {
    return <NoResumesNotice />;
  }

  if (output.status === "needs_selection") {
    return (
      <ResumeSelectionPrompt
        toolName="generate_cover_letter"
        prompt="Which resume should the letter draw on?"
        resumes={output.resumes}
        messageFor={(title) =>
          `Write a cover letter for this job using my resume "${title}"`
        }
      />
    );
  }

  if (output.status === "unreadable") {
    return (
      <p className="text-sm">
        Couldn&apos;t read <strong>{output.title}</strong> — {output.reason}
      </p>
    );
  }

  if (output.status === "generation_failed") {
    return (
      <p className="text-sm">
        Couldn&apos;t write a letter for <strong>{output.jobTitle}</strong> —{" "}
        {output.reason}
      </p>
    );
  }

  return (
    <div className="text-sm">
      <AgentMarkdown text={output.body} />
      <p className="mt-2 text-xs text-muted-foreground">
        {output.jobTitle}
        {output.company ? ` at ${output.company}` : ""} · drawn from{" "}
        {output.resumeTitle}
      </p>
      {output.saved ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Saved as “{output.coverLetterTitle}” —{" "}
          <Link href="/dashboard/profile" className="underline">
            edit it in Profile → Documents
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Letter not saved — {output.saveError}
        </p>
      )}
    </div>
  );
}
