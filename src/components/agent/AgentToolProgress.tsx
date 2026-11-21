"use client";

import Link from "next/link";
import {
  Check,
  Circle,
  CirclePause,
  Loader2,
  TimerOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { SlowResponseWarning } from "@/components/common/SlowResponseWarning";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { AGENT_TOOL_META, type AgentToolName } from "@/lib/agent/registry";
import { cn } from "@/lib/utils";
import type { AgentReplyStop } from "@/models/agent.model";
import type { AgentToolOutcome } from "@/components/agent/AgentToolViews";

type Mark = "done" | "running" | "failed" | "timedOut" | "interrupted" | "answer";

const MARKS: Record<Mark, { Icon: LucideIcon; color?: string }> = {
  done: { Icon: Check, color: "text-green-600 dark:text-green-500" },
  running: { Icon: Loader2, color: "text-orange-600 dark:text-amber-500" },
  failed: { Icon: X, color: "text-destructive" },
  timedOut: { Icon: TimerOff, color: "text-destructive" },
  interrupted: { Icon: CirclePause },
  answer: { Icon: Circle },
};

// The last reached step carries the tool's state; earlier ones are done.
function lastMark(
  outcome: AgentToolOutcome | undefined,
  running: boolean,
  stopped: AgentReplyStop | undefined,
): Mark {
  if (stopped === "timedOut" && (!outcome || outcome === "failed"))
    return "timedOut";
  if (outcome) return outcome === "ok" ? "done" : outcome;
  if (stopped === "interrupted") return "interrupted";
  return running ? "running" : "answer";
}

const MARK_NOTES: Partial<Record<Mark, string>> = {
  timedOut: "Timed out.",
  interrupted: "Interrupted.",
};

export type AgentToolProgressProps = {
  toolName: AgentToolName;
  steps: readonly string[];
  stepLabels?: Readonly<Record<string, string>>;
  resumeId?: string;
  durationSeconds?: Readonly<Record<string, number>>;
  section: "before" | "after";
  outcome?: AgentToolOutcome;
  running: boolean;
  stopped?: AgentReplyStop;
  streaming: boolean;
};

function resumeLabel(label: string | undefined, resumeId?: string) {
  if (!label || !resumeId) return label;
  const parts = /^(Using resume ")([\s\S]+)"(.*)$/.exec(label);
  if (!parts) return label;
  const [, prefix, title, note] = parts;
  return (
    <>
      {prefix}
      <Link href={`/dashboard/profile/resume/${resumeId}`} className="font-medium underline hover:text-foreground">
        {title}
      </Link>
      &quot;{note}
    </>
  );
}

export function AgentToolProgress({
  toolName,
  steps,
  stepLabels,
  resumeId,
  durationSeconds,
  section,
  outcome,
  running,
  stopped,
  streaming,
}: AgentToolProgressProps) {
  const meta = AGENT_TOOL_META[toolName];
  const labels = new Map<string, string>(meta.steps.map((s) => [s.id, s.label]));
  const order = meta.steps.map((s) => s.id as string);
  const generateAt = order.indexOf("generate");
  const visible = steps.flatMap((id, index) => {
    const inBefore = generateAt !== -1 && order.indexOf(id) <= generateAt;
    return inBefore === (section === "before") ? [{ id, index }] : [];
  });
  const holdsLast = visible.some(({ index }) => index === steps.length - 1);
  const slow = useSlowResponseWarning(running && holdsLast, streaming);
  if (visible.length === 0) return null;

  const current = lastMark(outcome, running, stopped);
  const label = `${meta.runningLabel.replace(/…$/, "")} progress`;

  return (
    <div className="rounded-sm border bg-muted/20 px-3 py-2">
      <ol aria-label={label} className="space-y-1 text-sm text-muted-foreground">
        {visible.map(({ id, index }) => {
          const isLast = index === steps.length - 1;
          const mark: Mark = isLast ? current : "done";
          const { Icon, color } = MARKS[mark];
          const note = isLast ? MARK_NOTES[mark] : undefined;
          const seconds = durationSeconds?.[id];
          const stepLabel = stepLabels?.[id] ?? labels.get(id);
          return (
            <li
              key={id}
              aria-current={isLast && mark === "running" ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <Icon
                aria-hidden="true"
                data-mark={mark}
                className={cn("size-3.5", color, mark === "running" && "animate-spin")}
              />
              <span className="text-muted-foreground">
                {id === "resume" ? resumeLabel(stepLabel, resumeId) : stepLabel}
              </span>
              {mark === "done" && seconds !== undefined && (
                <span className="shrink-0 text-xs">· {seconds}s</span>
              )}
              {note && (
                <span className={cn(mark === "timedOut" && "text-destructive")}>
                  {note}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {slow && <SlowResponseWarning />}
    </div>
  );
}
