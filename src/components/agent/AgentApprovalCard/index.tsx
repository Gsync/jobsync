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
import { isAgentToolName } from "@/lib/agent/registry";
import { AGENT_TOOL_VIEWS } from "@/components/agent/AgentToolViews";

type Respond = (r: { id: string; approved: boolean; reason?: string }) => void;

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

  const Approval = isAgentToolName(toolName) ? AGENT_TOOL_VIEWS[toolName].Approval : undefined;

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

      {Approval && <Approval input={input} pastedText={pastedText} />}

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
