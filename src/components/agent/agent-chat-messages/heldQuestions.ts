import type { UIMessage } from "ai";
import { mergeChoices } from "@/lib/questions/choices";
import { normalizeQuestionText } from "@/lib/questions/similarity";
import type { AgentAddQuestionResult } from "@/models/agent.model";
import type { SaveQuestionInput, SaveQuestionResult } from "@/models/question.model";

export type HeldItem = Extract<SaveQuestionResult, { status: "exists" | "similar" }>;

// Questions still waiting after the turn, and targets a merge in it changed
export type HeldOutcome = { waiting: HeldItem[]; changed: ReadonlySet<string> };

type Part = UIMessage["parts"][number];
type State = { waiting: Map<string, HeldItem>; changed: Set<string> };

const RESOLVED: ReadonlySet<SaveQuestionResult["status"]> = new Set(["saved", "merged", "skipped"]);

function targetIds(held: HeldItem): string[] {
  return held.status === "exists" ? [held.existing.id] : held.candidates.map((c) => c.id);
}

// A reworded re-call is matched by its target, and only when one input owns it
function releaseTarget(state: State, target: string) {
  const owners = [...state.waiting].filter(([, held]) => targetIds(held).includes(target));
  for (const [key] of owners) state.waiting.delete(key);
}

function applyItem(state: State, item: SaveQuestionResult, inputs: SaveQuestionInput[]) {
  const key = normalizeQuestionText(item.question);
  if (item.status === "exists" || item.status === "similar") {
    state.waiting.set(key, item);
    return;
  }
  if (!RESOLVED.has(item.status)) return;
  const target = inputs.find((i) => normalizeQuestionText(i.question) === key)?.mergeInto?.questionId;
  if (item.status === "merged" && target) state.changed.add(target);
  if (state.waiting.delete(key) || !target) return;
  releaseTarget(state, target);
}

function addQuestionResults(part: Part): { items: SaveQuestionResult[]; inputs: SaveQuestionInput[] } | undefined {
  if (part.type !== "tool-add_question" || part.state !== "output-available") return;
  const output = part.output as AgentAddQuestionResult | undefined;
  if (!output?.items) return;
  const inputs = (part.input as { questions?: SaveQuestionInput[] } | undefined)?.questions ?? [];
  return { items: output.items, inputs };
}

// Ordered add_question results in one assistant turn. Silent only: any visible
// text after the last call means the model already explained the choices
export function heldAfterSilence(message: UIMessage): HeldOutcome | undefined {
  const lastCall = message.parts.findLastIndex((p) => p.type === "tool-add_question");
  if (lastCall === -1) return;
  const after = message.parts.slice(lastCall + 1);
  if (after.some((p) => p.type === "text" && p.text.trim().length > 0)) return;

  const state: State = { waiting: new Map(), changed: new Set() };
  for (const part of message.parts) {
    const results = addQuestionResults(part);
    if (!results) continue;
    for (const item of results.items) applyItem(state, item, results.inputs);
  }
  if (state.waiting.size === 0) return;
  return { waiting: [...state.waiting.values()], changed: state.changed };
}

// Older transcripts lack these facts; their choices are not guessed
export function hasCapabilities(held: HeldItem): boolean {
  if (held.status === "exists") return typeof held.existing.canReplace === "boolean";
  return typeof held.hasIncomingAnswer === "boolean" &&
    held.candidates.every((c) => typeof c.canReplace === "boolean");
}

export function targetChoices(
  target: { id: string; hasAnswer: boolean; canReplace?: boolean },
  changed: ReadonlySet<string>,
): string[] {
  if (changed.has(target.id)) return ["add your answer to the saved question"];
  return mergeChoices(target);
}
