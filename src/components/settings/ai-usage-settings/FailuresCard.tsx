import { forwardRef } from "react";
import { AI_FAILURE_STATUSES, type AiUsageSummary } from "@/models/aiUsage.model";
import { FAILURE_META } from "./format";

const FailuresCard = forwardRef<
  HTMLElement,
  Pick<AiUsageSummary, "totals" | "failuresByStatus">
>(function FailuresCard({ totals, failuresByStatus }, ref) {
  return (
    <section
      ref={ref}
      id="ai-usage-failures"
      className="flex flex-col overflow-hidden rounded-lg border"
    >
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">Failures</h2>
        <span className="text-xs text-muted-foreground">
          {`${totals.failures.toLocaleString("en-US")} of ${totals.calls.toLocaleString("en-US")} calls`}
        </span>
      </div>
      <div className="grow py-1.5">
        {AI_FAILURE_STATUSES.map((status) => {
          const meta = FAILURE_META[status];
          return (
            <div
              key={status}
              className="flex items-start gap-3 px-5 py-2.5 text-[13px]"
            >
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${meta.dotClassName}`}
              />
              <span className="flex grow flex-col gap-0.5">
                <span className="font-medium">{meta.label}</span>
                <span className="text-xs text-muted-foreground">
                  {meta.description}
                </span>
              </span>
              <span className="w-8 text-right font-semibold tabular-nums">
                {failuresByStatus[status]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between border-t px-5 py-3 text-xs text-muted-foreground">
        <span>Stopped by you — not counted as failures</span>
        <span className="tabular-nums">{totals.stopped}</span>
      </div>
    </section>
  );
});

export default FailuresCard;
