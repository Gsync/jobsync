import { createHash } from "node:crypto";
import { asSchema, type ModelMessage, type ToolSet } from "ai";

export type TurnPrefixMetrics = {
  systemChars: number;
  toolChars: number;
  messageChars: number;
  prefixChanged: boolean;
};

// Ollama reuses the KV cache only while the leading bytes match the previous
// request, so a prefix that changes mid-conversation costs a full recompute.
// Keyed by user because that IS the conversation — ChatConversation.userId is
// unique. Process-local on purpose: a restart mislabels one turn, which is
// cheaper than persisting a diagnostic.
const lastPrefixHash = new Map<string, string>();

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
  const previous = lastPrefixHash.get(args.userId);
  lastPrefixHash.set(args.userId, hash);

  return {
    systemChars: args.system.length,
    toolChars: material.length,
    messageChars: JSON.stringify(args.modelMessages).length,
    prefixChanged: previous !== undefined && previous !== hash,
  };
}
