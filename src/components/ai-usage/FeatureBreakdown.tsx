import { AI_USAGE_FEATURES, type AiUsageSummary } from "@/models/aiUsage.model";
import { formatSeconds, formatTokens } from "./format";

export default function FeatureBreakdown({
  features,
}: Pick<AiUsageSummary, "features">) {
  const maxTokens = Math.max(1, ...features.map((f) => f.tokens));
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">By feature</h2>
        <span className="text-xs text-muted-foreground">
          Tokens · Calls · Median
        </span>
      </div>
      <div className="py-1.5">
        {features.map((f) => (
          <div
            key={f.feature}
            className="flex items-center gap-2.5 px-5 py-2 text-[13px]"
          >
            <span className="w-[110px] shrink-0">
              {AI_USAGE_FEATURES[f.feature] ?? f.feature}
            </span>
            <span className="block h-1.5 grow overflow-hidden rounded-full bg-muted">
              <span
                className="block h-1.5 bg-teal-500"
                style={{ width: `${(f.tokens / maxTokens) * 100}%` }}
              />
            </span>
            <span className="w-[52px] text-right font-medium tabular-nums">
              {formatTokens(f.tokens)}
            </span>
            <span className="w-9 text-right tabular-nums text-muted-foreground">
              {f.calls.toLocaleString("en-US")}
            </span>
            <span className="w-11 text-right tabular-nums text-muted-foreground">
              {formatSeconds(f.medianMs)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
