// Reasoning models (e.g. qwen3 family) emit <think>...</think> in the text
// stream. Drop complete blocks, and drop an unterminated trailing block so a
// half-finished thought never flashes into the rendered output.
// Isomorphic — no `server-only`, safe to import from client and server.
export function stripThinking(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const openIdx = out.search(/<think>/i);
  if (openIdx !== -1) out = out.slice(0, openIdx);
  return out;
}
