import { randomUUID } from "node:crypto";
import { APP_CONSTANTS } from "@/lib/constants";

// The only node:crypto user in the paste pipeline — kept out of paste.ts so
// client components can import the rest.

function generateNonce(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
}

// Sanitize THEN wrap. A static delimiter is breakout-able by construction:
// the attacker authors the posting and controls exactly the head that gets
// injected, so closing the delimiter early is trivial. Stripping after
// wrapping would remove the delimiters we just added.
export function truncateForModel(
  text: string,
  nonce: string = generateNonce(),
): { block: string; nonce: string } {
  const head = text.slice(0, APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS);
  const sanitized = head.split(nonce).join("");
  const block = `<<<PASTED_${nonce}>>>\n${sanitized}\n<<<END_PASTED_${nonce}>>>`;
  return { block, nonce };
}
