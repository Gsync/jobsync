"use client";

import type { DirectInvokeToolName } from "@/lib/agent/registry";

import { AgentResumePicker } from "@/components/agent/AgentResumePicker";

export function ResumeSelectionPrompt({
  prompt,
  resumes,
  messageFor,
  toolName,
}: {
  prompt: string;
  resumes: { id: string; title: string }[];
  toolName?: DirectInvokeToolName;
  messageFor?: (title: string) => string;
}) {
  return (
    <div className="text-sm">
      <p>{prompt}</p>
      <AgentResumePicker resumes={resumes} messageFor={messageFor} toolName={toolName} />
    </div>
  );
}
