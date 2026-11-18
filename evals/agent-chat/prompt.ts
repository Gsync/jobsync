import { AGENT_CHAT_SYSTEM_PROMPT, buildPageContextMessage, buildPasteContextMessage } from '../../src/lib/agent/prompt';
import { APP_CONSTANTS } from '../../src/lib/constants';

type Message = Record<string, unknown>;

// Mirrors what the route injects: the user's typed message, then the pasted
// head as a separate delimited data message. A fixed nonce keeps rows stable
// across runs; the route generates a random one per request.
const NONCE = 'EVALNONCE0001';

// The two endpoints disagree about this field and both reject the other's
// shape: ollama's native /api/chat wants tool-call arguments as an OBJECT and
// 400s on a JSON string ("Value looks like object, but can't find closing '}'
// symbol"), while OpenAI-compatible endpoints want the string and 400 on the
// object ("invalid type: map, expected a string"). Getting it wrong is silent
// — promptfoo records the 400 as an empty completion, which reads as "answered
// without calling a tool" and passes a follow-up assertion vacuously. That is
// what the review follow-up rows did on ollama for their whole life.
function toolArguments(args: Record<string, unknown>, providerId: string): unknown {
  return providerId.startsWith('ollama:') ? args : JSON.stringify(args);
}

// Mirrors a completed review_resume round-trip so follow-up rows start after
// the review, exactly as the model sees it on the second turn. The review
// text is the tool's OUTPUT now, not the model's own prose.
function reviewTurn(reviewBody: string, providerId: string): Message[] {
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
          function: { name: 'review_resume', arguments: toolArguments({}, providerId) },
        },
      ],
    },
    { role: 'tool', tool_call_id: 'call_review_resume_1', content: JSON.stringify(output) },
  ];
}

function resumeSelectionTurn(providerId: string): Message[] {
  const output = {
    status: 'needs_selection',
    resumes: [
      { id: 'resume-eval-1', title: 'Backend 2026' },
      { id: 'resume-eval-2', title: 'Product Manager' },
    ],
  };
  return [
    {
      role: 'assistant',
      content: null,
      reasoning_content: '',
      tool_calls: [
        {
          id: 'call_get_resume_1',
          type: 'function',
          function: { name: 'get_resume', arguments: toolArguments({}, providerId) },
        },
      ],
    },
    { role: 'tool', tool_call_id: 'call_get_resume_1', content: JSON.stringify(output) },
  ];
}

// Mirrors a confirmed add_job round-trip: the user pressed Confirm, the write
// happened, and the route resumed the loop for a step that narrates it. The
// result is AgentAddJobResult's created branch verbatim — the model is told
// nothing about the card beyond this, which is the point of the row.
function addJobTurn(providerId: string): Message[] {
  const output = {
    created: true,
    jobId: 'job-eval-created-1',
    resolutions: [
      { id: 'company-1', label: 'Helio Systems', created: true },
      { id: 'title-1', label: 'Staff Data Engineer', created: false },
    ],
    descriptionSource: 'pasted',
    descriptionChars: 2731,
    descriptionCompleteness: 'full',
  };
  return [
    {
      role: 'assistant',
      content: null,
      reasoning_content: '',
      tool_calls: [
        {
          id: 'call_add_job_1',
          type: 'function',
          function: {
            name: 'add_job',
            arguments: toolArguments(
              {
                company: 'Helio Systems',
                jobTitle: 'Staff Data Engineer',
                jobDescription: 'Helio Systems is hiring a Staff Data Engineer to own the pipelines behind its analytics platform.',
              },
              providerId,
            ),
          },
        },
      ],
    },
    { role: 'tool', tool_call_id: 'call_add_job_1', content: JSON.stringify(output) },
  ];
}

export default function prompt({
  vars,
  provider,
}: {
  vars: Record<string, string>;
  // promptfoo's PromptFunctionContext always supplies this; optional only so
  // the file stays callable from a scratch script.
  provider?: { id?: string };
}): Message[] {
  const providerId = provider?.id ?? '';
  // A paste under AGENT_CHAT_PASTE_THRESHOLD makes no chip, so it reaches the
  // model as ordinary message text with no delimiters and no pastedText behind
  // it. That is the path where an omitted jobDescription is unrecoverable.
  const userMessage = vars.inlinePosting
    ? `${vars.userMessage}\n\n${vars.inlinePosting}`
    : vars.userMessage;

  const messages: Message[] = [
    { role: 'system', content: AGENT_CHAT_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  if (vars.priorReview) messages.push(...reviewTurn(vars.priorReview, providerId));
  if (vars.priorAddJob) messages.push(...addJobTurn(providerId));
  if (vars.priorResumeSelection) messages.push(...resumeSelectionTurn(providerId));
  if (vars.followUp) messages.push({ role: 'user', content: vars.followUp });

  // Injected after the newest user message, and exactly once however many
  // turns the row replays: the route pushes it at the tail of every turn the
  // user speaks and never persists it, so history carries no older copies.
  // Position is the point — it is what has to outrank a stale no_job result
  // sitting in the transcript — so building it before a replayed turn would
  // measure the ordering the block was added to fix. Rows say where they are;
  // the default is a page with no job open.
  const pageContext =
    vars.pageLocation === 'job'
      ? { route: '/dashboard/myjobs/job-eval-1', jobId: 'job-eval-1' }
      : vars.pageLocation === 'jobs-list'
        ? { route: '/dashboard/myjobs' }
        : undefined;
  // The route's lastIsUser guard, reproduced: an approval-resume POST ends on
  // the assistant's turn, so nothing is injected on it.
  if (messages[messages.length - 1]?.role === 'user') {
    messages.push({ role: 'user', content: buildPageContextMessage(pageContext) });
  }

  // Last, as in the route: a pasted posting outranks the page line.
  if (vars.jobPosting) {
    const head = vars.jobPosting.slice(0, APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS);
    const block = `<<<PASTED_${NONCE}>>>\n${head.split(NONCE).join('')}\n<<<END_PASTED_${NONCE}>>>`;
    messages.push({ role: 'user', content: buildPasteContextMessage(block) });
  }

  return messages;
}
