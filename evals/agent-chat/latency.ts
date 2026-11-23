import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { questionResultsForModel } from '../../src/models/agent.model';
import prompt from './prompt';

// Wall-clock latency of the add_job / add_question round trip per model: the
// decision turn (emits the tool call) and the reply turn (after a simulated
// successful tool result). promptfoo's latencyMs stops at response headers,
// which DeepSeek sends before generating, so this times the full body, one
// request at a time.
// Usage: npm run eval:agent-chat-latency [-- --repeat 3]

type Message = Record<string, unknown>;
type Test = { description: string; vars: Record<string, string>; assert?: { value?: string }[] };
type ToolCall = { id: string; name: string; args: Record<string, unknown> };
type Result = { message: Message; calls: ToolCall[]; completion: number; reasoning: number; loadMs: number };
type Turn = { ms: number; completion: number; reasoning: number };
type Sample = { provider: string; tool: string; called: boolean; decision: Turn; reply?: Turn };

process.loadEnvFile(join(__dirname, '../../.env'));

const DIR = __dirname;
const TOOLS = JSON.parse(readFileSync(join(DIR, 'tools.json'), 'utf8'));
const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const repeatArg = process.argv.indexOf('--repeat');
const REPEAT = repeatArg > -1 ? Number(process.argv[repeatArg + 1]) : 3;

// Same settings as the providers in promptfooconfig.yaml
const PROVIDERS = [
  { label: 'deepseek-v4-flash', id: 'openai:chat:deepseek-v4-flash', call: callDeepSeek },
  { label: 'ollama-qwen3.5-9b', id: 'ollama:chat:qwen3.5:9b', call: callOllama },
];

type RawCall = { id?: string; function: { name: string; arguments: string | Record<string, unknown> } };
type DeepSeekResponse = {
  choices: { message: Message & { reasoning_content?: string; tool_calls?: RawCall[] } }[];
  usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
};
type OllamaResponse = {
  message: Message & { tool_calls?: RawCall[] };
  eval_count?: number;
  load_duration?: number;
};

function parseCalls(raw: RawCall[] | undefined): ToolCall[] {
  return (raw ?? []).map((call, index) => ({
    id: call.id ?? `call_${index}`,
    name: call.function.name,
    args: typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments,
  }));
}

async function callDeepSeek(messages: Message[]): Promise<Result> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-v4-flash', messages, tools: TOOLS, tool_choice: 'auto', temperature: 0, max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as DeepSeekResponse;
  const message = data.choices[0].message;
  return {
    // Replayed as-is: DeepSeek 400s on an assistant turn without reasoning_content
    message: { ...message, reasoning_content: message.reasoning_content ?? '' },
    calls: parseCalls(message.tool_calls),
    completion: data.usage?.completion_tokens ?? 0,
    reasoning: data.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    loadMs: 0,
  };
}

async function callOllama(messages: Message[]): Promise<Result> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3.5:9b', messages, tools: TOOLS, stream: false, think: true,
      options: { temperature: 0.1, num_ctx: 16384 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as OllamaResponse;
  return {
    message: data.message,
    calls: parseCalls(data.message.tool_calls),
    // Ollama reports one eval_count covering thinking and visible output
    completion: data.eval_count ?? 0,
    reasoning: 0,
    loadMs: Math.round((data.load_duration ?? 0) / 1e6),
  };
}

// A successful result in the shape the real tool returns to the model
function toolResult(call: ToolCall, test: Test): unknown {
  if (call.name === 'add_job') {
    const description = String(call.args.jobDescription ?? '');
    return {
      created: true,
      jobId: 'job-latency-1',
      resolutions: [
        { id: 'company-1', label: String(call.args.company), created: true },
        { id: 'title-1', label: String(call.args.jobTitle), created: false },
      ],
      descriptionSource: test.vars.jobPosting ? 'pasted' : 'model',
      descriptionChars: test.vars.jobPosting?.length ?? description.length,
      descriptionCompleteness: 'full',
    };
  }
  const questions = (call.args.questions ?? []) as { question: string; tags?: string[] }[];
  return questionResultsForModel(questions.map((item, index) => ({
    index: index + 1,
    question: item.question,
    status: 'saved',
    tags: (item.tags ?? []).map((label, tagIndex) => ({ id: `tag-${tagIndex}`, label, created: false })),
    droppedTags: [],
  })));
}

function replyMessages(messages: Message[], decision: Result, test: Test): Message[] {
  const results = decision.calls.map((call) => ({
    role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult(call, test)),
  }));
  return [...messages, decision.message, ...results];
}

function resolveVars(vars: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(vars).map(([key, value]) => {
    const text = String(value);
    return [key, text.startsWith('file://') ? readFileSync(join(DIR, text.slice('file://'.length)), 'utf8') : text];
  }));
}

function expectedTool(test: Test): string | undefined {
  const asserts = (test.assert ?? []).map((a) => a.value ?? '');
  if (asserts.some((v) => v.endsWith(':assertCallsAddJob'))) return 'add_job';
  if (asserts.some((v) => v.endsWith(':assertCallsAddQuestion'))) return 'add_question';
  return undefined;
}

async function timed(call: () => Promise<Result>): Promise<{ result: Result; turn: Turn }> {
  const start = performance.now();
  const result = await call();
  const turn = { ms: Math.round(performance.now() - start), completion: result.completion, reasoning: result.reasoning };
  return { result, turn };
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

function seconds(values: number[], p: number): string {
  if (values.length === 0) return '-';
  return (percentile([...values].sort((a, b) => a - b), p) / 1000).toFixed(1);
}

function average(values: number[]): number | string {
  return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : '-';
}

function summarize(samples: Sample[]) {
  const groups = Map.groupBy(samples, (s) => `${s.provider}|${s.tool}`);
  const rows = [...groups].map(([key, group]) => {
    const [provider, tool] = key.split('|');
    const decision = group.map((s) => s.decision.ms);
    const replied = group.filter((s) => s.reply);
    const reply = replied.map((s) => s.reply!.ms);
    const total = replied.map((s) => s.decision.ms + s.reply!.ms);
    return {
      provider, tool,
      'called': `${group.filter((s) => s.called).length}/${group.length}`,
      'decide med s': seconds(decision, 0.5),
      'decide p90 s': seconds(decision, 0.9),
      'reply med s': seconds(reply, 0.5),
      'reply p90 s': seconds(reply, 0.9),
      'total med s': seconds(total, 0.5),
      'total p90 s': seconds(total, 0.9),
      'decide tok': average(group.map((s) => s.decision.completion)),
      'decide reason tok': average(group.map((s) => s.decision.reasoning)),
      'reply tok': average(replied.map((s) => s.reply!.completion)),
    };
  });
  console.table(rows);
}

async function runSample(provider: (typeof PROVIDERS)[number], test: Test & { tool: string }): Promise<Sample> {
  const messages = prompt({ vars: test.vars, provider: { id: provider.id } });
  const { result, turn: decision } = await timed(() => provider.call(messages));
  const called = result.calls.some((call) => call.name === test.tool);
  const load = result.loadMs > 1000 ? ` [model reload ${result.loadMs} ms]` : '';
  // Reply turn only when every call is the expected tool, so each gets a real-shaped result
  const replyable = called && result.calls.every((call) => call.name === test.tool);
  const reply = replyable ? (await timed(() => provider.call(replyMessages(messages, result, test)))).turn : undefined;
  const replyText = reply ? `reply ${String(reply.ms).padStart(7)} ms` : 'reply       -   ';
  console.log(`${provider.label}  ${test.tool.padEnd(12)} decide ${String(decision.ms).padStart(7)} ms  ${replyText}  ${called ? 'called ' : 'NO CALL'}  ${test.description.slice(0, 50)}${load}`);
  return { provider: provider.label, tool: test.tool, called, decision, reply };
}

async function main() {
  const config = yaml.load(readFileSync(join(DIR, 'promptfooconfig.yaml'), 'utf8')) as { tests: Test[] };
  const tests = config.tests.flatMap((test) => {
    const tool = expectedTool(test);
    return tool ? [{ ...test, tool, vars: resolveVars(test.vars) }] : [];
  });
  console.log(`${tests.length} rows (${tests.filter((t) => t.tool === 'add_job').length} add_job), repeat ${REPEAT}\n`);

  const samples: Sample[] = [];
  for (const provider of PROVIDERS) {
    // Warm-up, discarded: loads the Ollama model and opens the DeepSeek connection
    const warm = await provider.call(prompt({ vars: tests[0].vars, provider: { id: provider.id } }));
    console.log(`${provider.label} warm-up done${warm.loadMs ? ` (model load ${warm.loadMs} ms)` : ''}`);

    for (let round = 0; round < REPEAT; round++) {
      for (const test of tests) {
        try {
          samples.push(await runSample(provider, test));
        } catch (error) {
          console.error(`${provider.label}  ${test.tool}  ERROR  ${test.description.slice(0, 50)}: ${(error as Error).message}`);
        }
      }
    }
  }

  console.log('\nAll samples (reply/total cover only samples that called the tool):');
  summarize(samples);
  console.log('Only samples that called the expected tool:');
  summarize(samples.filter((s) => s.called));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
