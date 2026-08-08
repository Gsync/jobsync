"use client";

import Link from "next/link";
import { getToolName, type ToolUIPart } from "ai";
import { Badge } from "@/components/ui/badge";
import { AgentResumePicker } from "@/components/agent/AgentResumePicker";
import { AgentMatchContent } from "@/components/agent/AgentMatchContent";
import { AgentReviewContent } from "@/components/agent/AgentReviewContent";
import type {
  AgentAddJobResult,
  AgentGetResumeResult,
  AgentMatchJobResult,
  AgentReviewResumeResult,
} from "@/models/agent.model";

// Composed from the tool result's STRUCTURED fields, never from
// createJobFromNames' message string — that prose is MCP-facing protocol text
// naming update_job and allowDuplicate, tools this surface does not expose.
function AddJobResult({
  output,
  input,
}: {
  output: AgentAddJobResult;
  input: Record<string, unknown>;
}) {
  if (output.validationError) {
    return <p className="text-sm">Could not add the job — {output.validationError}</p>;
  }

  if (output.duplicateOf) {
    return (
      <div className="text-sm">
        <p>
          Already tracked: <strong>{output.duplicateOf.title}</strong> at{" "}
          <strong>{output.duplicateOf.company}</strong>. No second job was
          created.
        </p>
        <Link
          className="text-xs underline"
          href={`/dashboard/myjobs/${output.duplicateOf.id}`}
        >
          Open the existing job
        </Link>
      </div>
    );
  }

  const newEntities = output.resolutions
    .filter((r) => r.created)
    .map((r) => r.label);
  const jobTitle = typeof input.jobTitle === "string" ? input.jobTitle : "job";
  const company = typeof input.company === "string" ? input.company : undefined;

  return (
    <div className="text-sm">
      <p>
        Added <strong>{jobTitle}</strong>
        {company ? ` at ${company}` : ""}.
      </p>
      {output.jobId && (
        <Link
          className="text-xs underline"
          href={`/dashboard/myjobs/${output.jobId}`}
        >
          Open the job
        </Link>
      )}
      {newEntities.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          New: {newEntities.join(", ")}
        </p>
      )}
      {output.descriptionChars !== undefined && (
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Description ·{" "}
            {output.descriptionSource === "pasted"
              ? "pasted verbatim"
              : "model-supplied"}{" "}
            · {output.descriptionChars} chars
          </span>
          {output.descriptionCompleteness && (
            <Badge variant="outline">{output.descriptionCompleteness}</Badge>
          )}
        </p>
      )}
    </div>
  );
}

// The resume text itself is never rendered: the user is about to read the
// review, not the serialization, and the card would be a wall of text.
function GetResumeResult({ output }: { output: AgentGetResumeResult }) {
  if (output.status === "no_resumes") {
    return (
      <p className="text-sm">
        You don&apos;t have any resumes yet — create one on the Profile page.
      </p>
    );
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
      <div className="text-sm">
        <p>Which resume?</p>
        <AgentResumePicker resumes={output.resumes} />
      </div>
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

// The scores and body come from the tool output, not from parsed prose — the
// review is a server-side generation now, so the card cannot disagree with
// what was saved.
function ReviewResumeResult({ output }: { output: AgentReviewResumeResult }) {
  if (output.status === "no_resumes") {
    return (
      <p className="text-sm">
        You don&apos;t have any resumes yet — create one on the Profile page.
      </p>
    );
  }

  if (output.status === "needs_selection") {
    return (
      <div className="text-sm">
        <p>Which resume?</p>
        <AgentResumePicker resumes={output.resumes} />
      </div>
    );
  }

  if (output.status === "unreadable" || output.status === "generation_failed") {
    return (
      <p className="text-sm">
        Couldn&apos;t review <strong>{output.title}</strong> — {output.reason}
      </p>
    );
  }

  return (
    <div className="text-sm">
      <AgentReviewContent body={output.body} scores={output.scores} />
      {!output.saved && (
        <p className="mt-2 text-xs text-muted-foreground">
          Review not saved — {output.saveError}
        </p>
      )}
    </div>
  );
}

// The score and body come from the tool output, not from parsed prose — the
// match is a server-side generation, so the card cannot disagree with what
// was saved.
function MatchJobResult({ output }: { output: AgentMatchJobResult }) {
  if (output.status === "no_job") {
    return (
      <p className="text-sm">
        Open the job you want to match first — I score the job you&apos;re
        looking at.
      </p>
    );
  }

  if (output.status === "no_resumes") {
    return (
      <p className="text-sm">
        You don&apos;t have any resumes yet — create one on the Profile page.
      </p>
    );
  }

  if (output.status === "needs_selection") {
    return (
      <div className="text-sm">
        <p>Which resume should I match against?</p>
        <AgentResumePicker
          resumes={output.resumes}
          messageFor={(title) => `Match this job against my resume "${title}"`}
        />
      </div>
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
        Couldn&apos;t match <strong>{output.jobTitle}</strong> — {output.reason}
      </p>
    );
  }

  return (
    <div className="text-sm">
      <AgentMatchContent body={output.body} scores={output.scores} />
      <p className="mt-2 text-xs text-muted-foreground">
        {output.jobTitle}
        {output.company ? ` at ${output.company}` : ""} · matched against{" "}
        {output.resumeTitle}
      </p>
      {!output.saved && (
        <p className="mt-1 text-xs text-muted-foreground">
          Match not saved — {output.saveError}
        </p>
      )}
    </div>
  );
}

export function AgentResultCard({ part }: { part: ToolUIPart }) {
  if (part.state === "output-denied") {
    return (
      <div className="rounded-sm border p-3 text-sm text-muted-foreground">
        Cancelled — nothing was saved.
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="rounded-sm border p-3 text-sm">
        That could not be completed. Try asking again.
      </div>
    );
  }

  if (part.state !== "output-available") return null;

  const toolName = getToolName(part);
  const body =
    toolName === "add_job" ? (
      <AddJobResult
        output={part.output as AgentAddJobResult}
        input={(part.input ?? {}) as Record<string, unknown>}
      />
    ) : toolName === "get_resume" ? (
      <GetResumeResult output={part.output as AgentGetResumeResult} />
    ) : toolName === "review_resume" ? (
      <ReviewResumeResult output={part.output as AgentReviewResumeResult} />
    ) : toolName === "match_job" ? (
      <MatchJobResult output={part.output as AgentMatchJobResult} />
    ) : null;

  return <div className="rounded-sm border p-3">{body}</div>;
}
