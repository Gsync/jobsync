"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiUsageSummary } from "@/models/aiUsage.model";
import { formatSeconds, formatTokens, providerLabel } from "./format";

const NUM = "text-right tabular-nums";

export default function ProviderModelTable({
  providers,
}: Pick<AiUsageSummary, "providers">) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const maxTokens = Math.max(1, ...providers.map((p) => p.tokens));
  const toggle = (provider: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });

  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">By provider and model</h2>
        <span className="text-xs text-muted-foreground">
          Per call · chat excludes the review, match or letter it started
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="flex items-center gap-2.5 border-b px-5 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="w-[204px]">Provider / model</span>
            <span className="grow">Share of tokens</span>
            <span className={cn("w-16", NUM)}>Tokens</span>
            <span className={cn("w-12", NUM)}>Calls</span>
            <span className={cn("w-16", NUM)}>Median</span>
            <span className={cn("w-16", NUM)}>p95</span>
            <span className={cn("w-20", NUM)}>First token</span>
          </div>
          {providers.map((p) => {
            const open = !collapsed.has(p.provider);
            return (
              <div key={p.provider} className="border-b last:border-b-0">
                <div className="flex items-center gap-2.5 px-5 py-2.5 text-[13px]">
                  <button
                    type="button"
                    onClick={() => toggle(p.provider)}
                    aria-expanded={open}
                    className="flex w-[204px] items-center gap-2.5 text-left font-semibold"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        !open && "-rotate-90",
                      )}
                    />
                    {providerLabel(p.provider)}
                  </button>
                  <span className="block h-1.5 grow overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-1.5 bg-blue-500"
                      style={{ width: `${(p.tokens / maxTokens) * 100}%` }}
                    />
                  </span>
                  <span className={cn("w-16 font-medium", NUM)}>
                    {formatTokens(p.tokens)}
                  </span>
                  <span className={cn("w-12 text-muted-foreground", NUM)}>
                    {p.calls.toLocaleString("en-US")}
                  </span>
                  <span className="w-16" />
                  <span className="w-16" />
                  <span className="w-20" />
                </div>
                {open &&
                  p.models.map((m) => (
                    <div
                      key={m.model}
                      className="flex items-center gap-2.5 pb-2.5 pl-11 pr-5 text-xs text-muted-foreground"
                    >
                      <span
                        className="w-[180px] truncate font-mono text-foreground/80"
                        title={m.model}
                      >
                        {m.model}
                      </span>
                      <span className="flex grow">
                        {m.nearContextLimit > 0 && (
                          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-amber-100 px-2 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {`${m.nearContextLimit} ${m.nearContextLimit === 1 ? "call" : "calls"} near context limit`}
                          </span>
                        )}
                      </span>
                      <span className={cn("w-16", NUM)}>
                        {formatTokens(m.tokens)}
                      </span>
                      <span className={cn("w-12", NUM)}>
                        {m.calls.toLocaleString("en-US")}
                      </span>
                      <span className={cn("w-16", NUM)}>
                        {formatSeconds(m.medianMs)}
                      </span>
                      <span className={cn("w-16", NUM)}>
                        {formatSeconds(m.p95Ms)}
                      </span>
                      <span className={cn("w-20", NUM)}>
                        {formatSeconds(m.medianFirstTokenMs)}
                      </span>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
