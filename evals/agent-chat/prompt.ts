import { AGENT_CHAT_SYSTEM_PROMPT, historicalPageHint, buildPasteContextMessage } from '../../src/lib/agent/prompt';
import { APP_CONSTANTS } from '../../src/lib/constants';
import { questionResultsForModel } from '../../src/models/agent.model';
import type { SaveQuestionResult } from '../../src/models/question.model';

import { longHistory } from './longHistory';

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

// The confirmed write ends with its result card in the transcript.
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

// One prior add_question round as saveQuestions returns it; the tool's own
// model view is applied below. Ids appear only in held results, as in the app.
const PRIOR_ADD_QUESTION: Record<string, { input: unknown; output: { items: SaveQuestionResult[] } }> = {
  exists: {
    input: { questions: [{ question: 'Why Postgres over Mongo?', answer: 'Postgres gives us relational integrity, and JSONB covers the document cases.', tags: ['Postgres'] }] },
    output: { items: [{ index: 1, question: 'Why Postgres over Mongo?', status: 'exists', existing: { id: 'q-eval-1', question: 'Why Postgres over Mongo?', hasAnswer: true, canReplace: true } }] },
  },
  similar: {
    input: { questions: [{ question: 'Why do you want to leave your job?', tags: ['Motivation'] }] },
    output: { items: [{ index: 1, question: 'Why do you want to leave your job?', status: 'similar', candidates: [{ id: 'q-eval-2', question: 'Why do you want to work here?', score: 0.45, hasAnswer: false, canReplace: false }], hasIncomingAnswer: false }] },
  },
  // The live pair: a shared opening scores 0.39, above the 0.25 floor
  similarWeakness: {
    input: { questions: [{ question: 'What are your weaknesses?', tags: ['Self-awareness'] }] },
    output: { items: [{ index: 1, question: 'What are your weaknesses?', status: 'similar', candidates: [{ id: 'q-eval-4', question: 'What are your strengths?', score: 0.39, hasAnswer: false, canReplace: false }], hasIncomingAnswer: false }] },
  },
  // A real rewording, no answer: notSameAs here would save a duplicate
  similarRewording: {
    input: { questions: [{ question: 'How do you deal with a broken deployment?', tags: ['Incident response'] }] },
    output: { items: [{ index: 1, question: 'How do you deal with a broken deployment?', status: 'similar', candidates: [{ id: 'q-eval-3', question: 'How do you handle a failing deploy?', score: 0.28, hasAnswer: true, canReplace: true }], hasIncomingAnswer: false }] },
  },
  // The same-question pair, scored 0.89 by the production matcher. Until
  // 2026-11-23 this row used the 0.28 broken-deployment pair
  similarAnswered: {
    input: { questions: [{ question: 'How do you handle a failing deployment?', answer: 'I roll back first, then find the cause from the deploy diff and the logs.', tags: ['Incident response'] }] },
    output: { items: [{ index: 1, question: 'How do you handle a failing deployment?', status: 'similar', candidates: [{ id: 'q-eval-3', question: 'How do you handle a failing deploy?', score: 0.89, hasAnswer: true, canReplace: true }], hasIncomingAnswer: true }] },
  },
  similarAnsweredBlank: {
    input: { questions: [{ question: 'How do you handle a failing deployment?', answer: 'I roll back first, then find the cause from the deploy diff and the logs.', tags: ['Incident response'] }] },
    output: { items: [{ index: 1, question: 'How do you handle a failing deployment?', status: 'similar', candidates: [{ id: 'q-eval-3', question: 'How do you handle a failing deploy?', score: 0.89, hasAnswer: false, canReplace: false }], hasIncomingAnswer: true }] },
  },
  similarAnsweredApp: {
    input: { questions: [{ question: 'How do you handle a failing deployment?', answer: 'I roll back first, then find the cause from the deploy diff and the logs.', tags: ['Incident response'] }] },
    output: { items: [{ index: 1, question: 'How do you handle a failing deployment?', status: 'similar', candidates: [{ id: 'q-eval-3', question: 'How do you handle a failing deploy?', score: 0.89, hasAnswer: true, canReplace: false }], hasIncomingAnswer: true }] },
  },
  refusedReplaceBlank: {
    input: { questions: [{ question: 'How do you handle a failing deployment?', answer: 'I roll back first, then find the cause from the deploy diff and the logs.', tags: ['Incident response'], mergeInto: { questionId: 'q-eval-3', mode: 'replace' } }] },
    output: { items: [{ index: 1, question: 'How do you handle a failing deployment?', status: 'invalid', error: 'This question has no saved answer to replace. Your answer can be added as its first answer instead.', appendOnly: true }] },
  },
  refusedReplaceApp: {
    input: { questions: [{ question: 'How do you handle a failing deployment?', answer: 'I roll back first, then find the cause from the deploy diff and the logs.', tags: ['Incident response'], mergeInto: { questionId: 'q-eval-3', mode: 'replace' } }] },
    output: { items: [{ index: 1, question: 'How do you handle a failing deployment?', status: 'invalid', error: 'Only an answer added below the saved one is allowed for this app-created question.', appendOnly: true }] },
  },
  mergedOntoTbd: {
    input: { questions: [{ question: 'How do you handle a failing deployment?', answer: 'I roll back first, then find the cause from the deploy diff and the logs.', tags: ['Incident response'], mergeInto: { questionId: 'q-eval-3', mode: 'append' } }] },
    output: { items: [{ index: 1, question: 'How do you handle a failing deployment?', status: 'merged', mode: 'append', savedQuestion: 'How do you handle a failing deploy?', hadAnswer: false, tags: [], droppedTags: [] }] },
  },
  saved: {
    input: { questions: [{ question: 'Tell me about yourself', tags: ['Introduction'] }, { question: 'Why Postgres over Mongo?', tags: ['Postgres'] }] },
    output: { items: [
      { index: 1, question: 'Tell me about yourself', status: 'saved', tags: [{ id: 'tag-1', label: 'Introduction', created: false }], droppedTags: [] },
      { index: 2, question: 'Why Postgres over Mongo?', status: 'saved', tags: [{ id: 'tag-2', label: 'Postgres', created: false }], droppedTags: [] },
    ] },
  },
};

function addQuestionTurn(kind: string, providerId: string, reply?: string, callId = 'call_add_question_1'): Message[] {
  const { input, output } = PRIOR_ADD_QUESTION[kind];
  return [
    {
      role: 'assistant', content: null, reasoning_content: '',
      tool_calls: [{
        id: callId, type: 'function',
        function: { name: 'add_question', arguments: toolArguments(input as Record<string, unknown>, providerId) },
      }],
    },
    { role: 'tool', tool_call_id: callId, content: JSON.stringify(questionResultsForModel(output.items)) },
    ...(reply ? [{ role: 'assistant', content: reply, reasoning_content: '' }] : []),
  ];
}

function noJobTurn(providerId: string): Message[] {
  return [
    {
      role: 'assistant', content: null, reasoning_content: '',
      tool_calls: [{
        id: 'call_match_job_1', type: 'function',
        function: { name: 'match_job', arguments: toolArguments({}, providerId) },
      }],
    },
    { role: 'tool', tool_call_id: 'call_match_job_1', content: JSON.stringify({ status: 'no_job' }) },
    { role: 'assistant', content: 'Please open the job you mean.', reasoning_content: '' },
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
    ...(vars.longHistory
      ? longHistory(vars.longHistory, userMessage, Number(vars.historyTurns))
      : [{ role: 'user', content: userMessage }]),
  ];

  if (vars.priorReview) messages.push(...reviewTurn(vars.priorReview, providerId));
  if (vars.priorAddJob) messages.push(...addJobTurn(providerId));
  if (vars.priorResumeSelection) messages.push(...resumeSelectionTurn(providerId));
  if (vars.priorNoJob) messages.push(...noJobTurn(providerId));
  if (vars.priorAddQuestion) {
    messages.push(...addQuestionTurn(vars.priorAddQuestion, providerId, vars.priorAssistantReply));
  }
  if (vars.followUp) messages.push({ role: 'user', content: vars.followUp });
  // A second round after the follow-up, e.g. a refused Replace; the model acts next
  if (vars.priorRetry) messages.push(...addQuestionTurn(vars.priorRetry, providerId, undefined, 'call_add_question_2'));

  const withPages = messages.flatMap((message, index) => {
    if (message.role !== 'user') return [message];
    const location = index === messages.length - 1 ? vars.pageLocation : vars.priorPageLocation;
    return [message, { role: 'user', content: historicalPageHint(location) }];
  });

  // Last, as in the route: a pasted posting outranks the page line.
  if (vars.jobPosting) {
    const head = vars.jobPosting.slice(0, APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS);
    const block = `<<<PASTED_${NONCE}>>>\n${head.split(NONCE).join('')}\n<<<END_PASTED_${NONCE}>>>`;
    const chars = { shown: head.length, total: vars.jobPosting.length };
    withPages.push({ role: 'user', content: buildPasteContextMessage(block, chars) });
  }

  return withPages;
}
