import { createHash } from "node:crypto";
import { asSchema, type ModelMessage, type ToolSet } from "ai";

export type TurnPrefixMetrics = {
  systemChars: number;
  toolChars: number;
  messageChars: number;
  prefixChanged: boolean;
  sharedPrefixChars: number;
};

// One previous request per user, process-local for diagnostics.
const lastPrefix = new Map<string, { hash: string; serialized: string }>();

export function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) index++;
  return index;
}

// The tool material as the provider will send it: every offered tool's name,
// description and JSON schema. Assembled once so the size and the hash read
// the same bytes.
function toolMaterial(tools: ToolSet): string {
  return Object.entries(tools)
    .map(([name, tool]) => {
      const schema = JSON.stringify(asSchema(tool.inputSchema).jsonSchema);
      return `${name}\n${tool.description ?? ""}\n${schema}`;
    })
    .join("\n");
}

// Sizes of what was actually sent, not of what the transcript holds. The
// estimates in docs/reviews/review-chat-agent-optimizations.md become facts
// here, and prefixChanged is the only direct evidence that the prefix stays
// cacheable as tools are scoped or deferred.
export function measureTurnPrefix(args: {
  userId: string;
  system: string;
  tools: ToolSet;
  modelMessages: ModelMessage[];
}): TurnPrefixMetrics {
  const material = toolMaterial(args.tools);
  const hash = createHash("sha1")
    .update(args.system)
    .update("\n")
    .update(material)
    .digest("hex");
  const messages = JSON.stringify(args.modelMessages);
  const serialized = [args.system, material, messages].join("\n");
  const previous = lastPrefix.get(args.userId);
  lastPrefix.set(args.userId, { hash, serialized });

  return {
    systemChars: args.system.length,
    toolChars: material.length,
    messageChars: messages.length,
    prefixChanged: previous !== undefined && previous.hash !== hash,
    sharedPrefixChars: previous ? commonPrefixLength(previous.serialized, serialized) : 0,
  };
}
