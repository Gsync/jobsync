"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { AgentAddQuestionResult, AgentQuestionPasteCut } from "@/models/agent.model";
import type { SaveQuestionResult } from "@/models/question.model";

type Status = SaveQuestionResult["status"];
type ItemOf<S extends Status> = Extract<SaveQuestionResult, { status: S }>;

function itemsWith<S extends Status>(items: SaveQuestionResult[], statuses: readonly S[]) {
  return items.filter((item): item is ItemOf<S> => (statuses as readonly Status[]).includes(item.status));
}

// Transcripts saved before savedQuestion existed name only the input
function storedQuestion(item: ItemOf<"merged">): string {
  return (item as { savedQuestion?: string }).savedQuestion ?? item.question;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="mt-2 first:mt-0">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-0.5 space-y-1">{children}</ul>
    </div>
  );
}

function SavedItem({ item }: { item: ItemOf<"saved"> }) {
  return (
    <li>
      {item.question}
      {item.tags.length > 0 && (
        <span className="mt-0.5 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">{tag.label}</Badge>
          ))}
        </span>
      )}
    </li>
  );
}

function PasteNotice({ paste }: { paste: AgentQuestionPasteCut }) {
  const read = paste.readChars.toLocaleString("en-US");
  const total = paste.totalChars.toLocaleString("en-US");
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {`Only the first ${read} of ${total} pasted characters were read, up to “${paste.lastQuestion}”. Paste the rest, starting with the question after it.`}
    </p>
  );
}

export function AddQuestionResult({ output }: { output: AgentAddQuestionResult }) {
  if (output.error) {
    return (
      <div className="text-sm">
        <p>{output.error}</p>
        {output.paste && <PasteNotice paste={output.paste} />}
      </div>
    );
  }

  const saved = itemsWith(output.items, ["saved"]);
  const updated = itemsWith(output.items, ["merged"]);
  const skipped = itemsWith(output.items, ["skipped"]);
  const held = itemsWith(output.items, ["exists", "similar", "invalid"]);
  const failed = itemsWith(output.items, ["failed"]);
  const repeats = itemsWith(output.items, ["repeat"]).length;

  return (
    <div className="text-sm">
      {saved.length > 0 && (
        <Group title="Saved">
          {saved.map((item) => <SavedItem key={item.index} item={item} />)}
        </Group>
      )}
      {updated.length > 0 && (
        <Group title="Updated">
          {updated.map((item) => (
            <li key={item.index}>
              {storedQuestion(item)}{" "}
              <span className="text-xs text-muted-foreground">
                · {item.mode === "replace" ? "Answer replaced" : "Answer added"}
              </span>
            </li>
          ))}
        </Group>
      )}
      {skipped.length > 0 && (
        <Group title="Already in your bank">
          {skipped.map((item) => <li key={item.index}>{item.question}</li>)}
        </Group>
      )}
      {held.length > 0 && (
        <Group title="Waiting on your reply">
          {held.map((item) => (
            <li key={item.index}>
              {item.question}
              {item.status === "invalid" && item.userFacing && (
                <>
                  {" "}
                  <span className="text-xs text-muted-foreground">· {item.error}</span>
                </>
              )}
            </li>
          ))}
        </Group>
      )}
      {failed.length > 0 && (
        <Group title="Not saved">
          {failed.map((item) => (
            <li key={item.index}>
              {item.question}{" "}
              <span className="text-xs text-muted-foreground">· {item.error}</span>
            </li>
          ))}
        </Group>
      )}
      {repeats > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {repeats} repeated {repeats === 1 ? "question" : "questions"} combined
        </p>
      )}
      {output.paste && <PasteNotice paste={output.paste} />}
    </div>
  );
}
