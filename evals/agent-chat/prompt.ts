import { AGENT_CHAT_SYSTEM_PROMPT, buildPasteContextMessage } from '../../src/lib/agent/prompt';
import { APP_CONSTANTS } from '../../src/lib/constants';

type Message = Record<string, unknown>;

// Mirrors what the route injects: the user's typed message, then the pasted
// head as a separate delimited data message. A fixed nonce keeps rows stable
// across runs; the route generates a random one per request.
const NONCE = 'EVALNONCE0001';

// Mirrors a completed review_resume round-trip so follow-up rows start after
// the review, exactly as the model sees it on the second turn. The review
// text is the tool's OUTPUT now, not the model's own prose.
function reviewTurn(reviewBody: string): Message[] {
  const output = {
    status: 'ok',
    resumeId: 'resume-eval-1',
    title: 'Senior Engineer Resume',
    scores: { overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 },
    body: reviewBody,
    saved: true,
  };
  return [
    {
      role: 'assistant',
      content: null,
      // DeepSeek's thinking mode 400s on a replayed assistant turn that has no
      // reasoning_content. Other providers ignore the field.
      reasoning_content: '',
      tool_calls: [
        {
          id: 'call_review_resume_1',
          type: 'function',
          function: { name: 'review_resume', arguments: '{}' },
        },
      ],
    },
    { role: 'tool', tool_call_id: 'call_review_resume_1', content: JSON.stringify(output) },
  ];
}

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

  if (vars.priorReview) messages.push(...reviewTurn(vars.priorReview));
  if (vars.followUp) messages.push({ role: 'user', content: vars.followUp });

  return messages;
}
