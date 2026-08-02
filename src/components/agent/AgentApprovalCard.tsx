"use client";

import { useEffect, useRef, useState } from "react";
import { getToolName, type ToolUIPart } from "ai";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
} from "@/components/ai-elements/confirmation";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { classifyDescriptionCompleteness } from "@/lib/jobs/descriptionCompleteness";

type Respond = (r: { id: string; approved: boolean; reason?: string }) => void;

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

function AddJobBody({
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
      <Row label="Company" value={text(input.company)} />
      <Row label="Job title" value={text(input.jobTitle)} />
      <Row label="Location" value={text(input.location)} />
      <Row label="Source" value={text(input.source)} />
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

export function AgentApprovalCard({
  part,
  pastedText,
  onRespond,
}: {
  part: ToolUIPart;
  pastedText?: string;
  onRespond: Respond;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // A blocking decision: focus moves here when it appears.
  useEffect(() => {
    if (part.state === "approval-requested") cardRef.current?.focus();
  }, [part.state]);

  if (part.state !== "approval-requested" && part.state !== "approval-responded")
    return null;

  const approvalId = part.approval?.id;
  const toolName = getToolName(part);
  const input = (part.input ?? {}) as Record<string, unknown>;

  const body = (() => {
    switch (toolName) {
      case "add_job":
        return <AddJobBody input={input} pastedText={pastedText} />;
      default:
        return null;
    }
  })();

  return (
    <Confirmation
      ref={cardRef}
      tabIndex={-1}
      approval={part.approval}
      state={part.state}
      className="rounded-sm p-3 outline-hidden"
    >
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Needs approval</Badge>
        <span className="text-sm font-semibold">{toolName}</span>
      </div>

      {body}

      {part.state === "approval-responded" && (
        <p className="text-xs text-muted-foreground">Waiting…</p>
      )}

      <ConfirmationRequest>
        {declining && (
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What was wrong? (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <ConfirmationAction
                onClick={() =>
                  approvalId &&
                  onRespond({ id: approvalId, approved: false, reason })
                }
              >
                Send
              </ConfirmationAction>
              <ConfirmationAction
                variant="ghost"
                onClick={() =>
                  approvalId && onRespond({ id: approvalId, approved: false })
                }
              >
                Skip
              </ConfirmationAction>
            </div>
          </div>
        )}
      </ConfirmationRequest>

      {!declining && (
        <ConfirmationActions>
          <ConfirmationAction
            onClick={() =>
              approvalId && onRespond({ id: approvalId, approved: true })
            }
          >
            Confirm
          </ConfirmationAction>
          {/* Client-side and always available — it must not depend on a
              server round-trip succeeding. */}
          <ConfirmationAction variant="outline" onClick={() => setDeclining(true)}>
            Cancel
          </ConfirmationAction>
        </ConfirmationActions>
      )}
    </Confirmation>
  );
}
