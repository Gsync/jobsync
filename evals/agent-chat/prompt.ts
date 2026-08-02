import { AGENT_CHAT_SYSTEM_PROMPT, buildPasteContextMessage } from '../../src/lib/agent/prompt';
import { APP_CONSTANTS } from '../../src/lib/constants';

type Message = Record<string, unknown>;

// Mirrors what the route injects: the user's typed message, then the pasted
// head as a separate delimited data message. A fixed nonce keeps rows stable
// across runs; the route generates a random one per request.
const NONCE = 'EVALNONCE0001';

export default function prompt({ vars }: { vars: Record<string, string> }): Message[] {
  const messages: Message[] = [
    { role: 'system', content: AGENT_CHAT_SYSTEM_PROMPT },
    { role: 'user', content: vars.userMessage },
  ];

  if (vars.jobPosting) {
    const head = vars.jobPosting.slice(0, APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS);
    const block = `<<<PASTED_${NONCE}>>>\n${head.split(NONCE).join('')}\n<<<END_PASTED_${NONCE}>>>`;
    messages.push({ role: 'user', content: buildPasteContextMessage(block) });
  }

  return messages;
}
