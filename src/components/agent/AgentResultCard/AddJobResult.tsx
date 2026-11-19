"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AgentAddJobResult } from "@/models/agent.model";

// Composed from the tool result's STRUCTURED fields, never from
// createJobFromNames' message string — that prose is MCP-facing protocol text
// naming update_job and allowDuplicate, tools this surface does not expose.
export function AddJobResult({
  output,
  input,
}: {
  output: AgentAddJobResult;
  input: Record<string, unknown>;
}) {
  if (output.validationError) {
    return (
      <p className="text-sm">
        Could not add the job — {output.displayError ?? output.validationError}
      </p>
    );
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
              : output.descriptionSource === "scraped"
                ? "scraped from the posting"
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
