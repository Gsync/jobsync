"use client";

import { useMemo } from "react";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import { renderAgentMarkdown } from "@/lib/agent/markdown";

// Re-rendered per streamed chunk, matching the review sheet's onUpdate
// snapshots. Half-open markdown flickers for a frame; the old surface has
// always lived with that and it is the price of progressive formatting.
export function AgentMarkdown({ text }: { text: string }) {
  const html = useMemo(() => renderAgentMarkdown(text), [text]);
  if (!html) return null;
  return (
    <div className="text-sm leading-relaxed [&_p]:mt-2 [&_ul]:mt-2 [&_ol]:mt-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
      <TipTapContentViewer content={html} />
    </div>
  );
}
