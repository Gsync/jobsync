import { InvalidToolInputError, type ToolCallRepairFunction, type ToolSet } from "ai";
import { log } from "@/lib/telemetry";

type Properties = Record<string, { type?: unknown } | boolean>;
type Input = Record<string, unknown>;

// Closers for brackets still open outside strings; null if cut mid-string
function missingClosers(raw: string): string | null {
  const open: string[] = [];
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "[") open.push("]");
    else if (ch === "{") open.push("}");
    else if (ch === "]" || ch === "}") open.pop();
  }
  return inString ? null : open.reverse().join("");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function hasType(value: unknown, type: "array" | "object"): boolean {
  if (type === "array") return Array.isArray(value);
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAs(raw: string, type: "array" | "object"): unknown {
  const whole = parseJson(raw);
  if (hasType(whole, type)) return whole;
  const closers = missingClosers(raw);
  if (!closers) return undefined;
  const closed = parseJson(raw + closers);
  return hasType(closed, type) ? closed : undefined;
}

function schemaType(properties: Properties, key: string): "array" | "object" | undefined {
  const prop = properties[key];
  if (typeof prop !== "object") return undefined;
  return prop.type === "array" || prop.type === "object" ? prop.type : undefined;
}

// A copy with each string-valued array/object field parsed, or null if none
export function repairTopLevelStrings(input: Input, properties: Properties): Input | null {
  let repaired = false;
  const next = { ...input };
  for (const [key, value] of Object.entries(input)) {
    const type = schemaType(properties, key);
    if (!type || typeof value !== "string") continue;
    const parsed = parseAs(value, type);
    if (parsed === undefined) continue;
    next[key] = parsed;
    repaired = true;
  }
  return repaired ? next : null;
}

// Ollama's XML tool parser (qwen3.5) passes an array or object argument it
// cannot parse through as text. qwen3.5:9b has been seen dropping a closing ]
export const repairStringifiedInput: ToolCallRepairFunction<ToolSet> = async ({ toolCall, inputSchema, error }) => {
  if (!InvalidToolInputError.isInstance(error)) return null;
  const input = parseJson(toolCall.input);
  if (!hasType(input, "object")) return null;
  const { properties } = await inputSchema({ toolName: toolCall.toolName });
  if (!properties) return null;
  const repaired = repairTopLevelStrings(input as Input, properties as Properties);
  if (!repaired) return null;
  log.warn("[agent-chat] repaired stringified tool input", { toolName: toolCall.toolName });
  return { ...toolCall, input: JSON.stringify(repaired) };
};
