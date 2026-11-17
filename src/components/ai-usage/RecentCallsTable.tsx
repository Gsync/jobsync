import { cn } from "@/lib/utils";
import { AI_USAGE_CONSTANTS } from "@/lib/constants";
import { AI_USAGE_FEATURES, type AiCallRow } from "@/models/aiUsage.model";
import {
  STATUS_META,
  formatCallTime,
  formatCount,
  formatSeconds,
} from "./format";

const NUM = "text-right tabular-nums";

export default function RecentCallsTable({ recent }: { recent: AiCallRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">Recent calls</h2>
        <span className="text-xs text-muted-foreground">
          {`Last ${AI_USAGE_CONSTANTS.RECENT_LIMIT} · kept for ${AI_USAGE_CONSTANTS.RETENTION_DAYS} days`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="flex items-center gap-3 border-b px-5 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="w-[104px]">Time</span>
            <span className="w-[110px]">Feature</span>
            <span className="grow">Model</span>
            <span className={cn("w-[60px]", NUM)}>Input</span>
            <span className={cn("w-[60px]", NUM)}>Output</span>
            <span className={cn("w-[68px]", NUM)}>Duration</span>
            <span className={cn("w-20", NUM)}>First token</span>
            <span className="w-24 text-right">Status</span>
          </div>
          {recent.map((r) => {
            const status = STATUS_META[r.status];
            return (
              <div
                key={r.id}
                className="flex h-10 items-center gap-3 border-b px-5 text-[13px] last:border-b-0"
              >
                <span className="w-[104px] tabular-nums text-muted-foreground">
                  {formatCallTime(new Date(r.startedAt))}
                </span>
                <span className="w-[110px]">
                  {AI_USAGE_FEATURES[r.feature] ?? r.feature}
                </span>
                <span
                  className="grow truncate font-mono text-xs text-foreground/80"
                  title={r.model}
                >
                  {r.model}
                </span>
                <span className={cn("w-[60px]", NUM)}>
                  {formatCount(r.inputTokens)}
                </span>
                <span className={cn("w-[60px]", NUM)}>
                  {formatCount(r.outputTokens)}
                </span>
                <span className={cn("w-[68px]", NUM)}>
                  {formatSeconds(r.durationMs)}
                </span>
                <span className={cn("w-20 text-muted-foreground", NUM)}>
                  {formatSeconds(r.firstTokenMs)}
                </span>
                <span className="flex w-24 justify-end">
                  <span
                    className={cn(
                      "inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
