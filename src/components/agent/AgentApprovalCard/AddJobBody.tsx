import { Badge } from "@/components/ui/badge";
import { classifyDescriptionCompleteness } from "@/lib/jobs/descriptionCompleteness";
import { decodeHtml } from "@/lib/scraper/html";

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {/* Text, never an anchor: this value came from an attacker-authorable
          posting by way of the model. */}
      <span className="break-words">{value}</span>
    </div>
  );
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

// Mirrors resolveEntity, so the card shows the name that will be saved.
function entityName(value: unknown): string | undefined {
  const name = text(value);
  return name && decodeHtml(name);
}

export function AddJobBody({
  input,
  pastedText,
}: {
  input: Record<string, unknown>;
  pastedText?: string;
}) {
  const description = pastedText ?? text(input.jobDescription);
  const source = pastedText ? "pasted verbatim" : "model-supplied";
  const completeness = description
    ? classifyDescriptionCompleteness(description)
    : undefined;
  const tags = Array.isArray(input.tags) ? input.tags.join(", ") : undefined;

  return (
    <div>
      <Row label="Company" value={entityName(input.company)} />
      <Row label="Job title" value={entityName(input.jobTitle)} />
      <Row label="Location" value={entityName(input.location)} />
      <Row label="Source" value={entityName(input.source)} />
      <Row label="URL" value={text(input.jobUrl)} />
      <Row label="Salary" value={text(input.salaryRange)} />
      <Row label="Tags" value={tags} />
      {description ? (
        <div className="mt-2 rounded-sm border bg-muted/20 p-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Description · {source} · {description.length} chars
            </span>
            {completeness && <Badge variant="outline">{completeness}</Badge>}
          </div>
          {/* Collapsed to ~200 chars: this is verbatim third-party content
              the model did not author, so it is the least interesting thing
              on the card, and a 6KB block would push Confirm below the fold. */}
          <p className="mt-1 line-clamp-3 text-xs">
            {description.slice(0, 200)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No description — the assistant will ask for one.
        </p>
      )}
    </div>
  );
}
