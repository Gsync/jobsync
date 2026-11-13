"use client";

import { Badge } from "@/components/ui/badge";
import type { AgentScrapeJobResult } from "@/models/agent.model";

// A read-only preview of what the scraper found. The authoritative list of
// fields still appears on add_job's confirmation card; this exists so a failed
// or partial scrape is visible instead of looking like nothing happened.
export function ScrapeJobResult({ output }: { output: AgentScrapeJobResult }) {
  if (output.status !== "ok") {
    return (
      <div className="text-sm">
        <p>Could not read that job posting — {output.reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the posting text and it can still be added.
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <p>
        Read <strong>{output.jobTitle}</strong>
        {output.company ? ` at ${output.company}` : ""}.
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{output.descriptionChars.toLocaleString()} chars</span>
        {output.location && <span>· {output.location}</span>}
        {output.salaryRange && <span>· {output.salaryRange}</span>}
        <Badge variant="outline">{output.descriptionCompleteness}</Badge>
        {!output.structuredData && <Badge variant="outline">page text</Badge>}
      </p>
      {output.warnings && output.warnings.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          {output.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
