type AssertionResult = { pass: boolean; score: number; reason: string };
type ToolCall = { name: string; args: Record<string, any> };
type Context = { vars: Record<string, string> };

// Shape of `output` varies: a bare tool_calls array, the whole assistant
// message (reasoning models emit content AND tool_calls together), or either
// of those stringified depending on caching. Normalize all of them, and treat
// a genuine text-only reply as [] so assertions fail with a readable reason.
function parseToolCalls(output: unknown): ToolCall[] {
  let raw: any = output;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!raw) return [];
  if (!Array.isArray(raw) && Array.isArray(raw.tool_calls)) {
    raw = raw.tool_calls;
  }
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((c: any) => {
      const fn = c?.function ?? c;
      if (!fn?.name) return null;
      let args: Record<string, any> = {};
      if (typeof fn.arguments === 'string') {
        try {
          args = JSON.parse(fn.arguments);
        } catch {
          args = {};
        }
      } else if (fn.arguments && typeof fn.arguments === 'object') {
        args = fn.arguments;
      }
      return { name: fn.name, args };
    })
    .filter(Boolean) as ToolCall[];
}

function describe(calls: ToolCall[]): string {
  return calls.length ? calls.map((c) => c.name).join(' + ') : 'no tool call (model replied with text)';
}

function expectSingle(output: unknown, expected: string): AssertionResult & { calls: ToolCall[] } {
  const calls = parseToolCalls(output);
  if (calls.length !== 1) {
    return {
      pass: false,
      score: 0,
      reason: `Expected exactly 1 call to ${expected}, got ${calls.length}: ${describe(calls)}`,
      calls,
    };
  }
  if (calls[0].name !== expected) {
    return {
      pass: false,
      score: 0,
      reason: `Expected ${expected}, got ${calls[0].name}`,
      calls,
    };
  }
  return { pass: true, score: 1, reason: `Routed to ${expected}`, calls };
}

function expectNone(output: unknown, forbidden: string[]): AssertionResult {
  const calls = parseToolCalls(output);
  const hit = calls.find((c) => forbidden.includes(c.name));
  return hit
    ? { pass: false, score: 0, reason: `Called forbidden tool ${hit.name}; expected one of the alternatives` }
    : { pass: true, score: 1, reason: `Avoided ${forbidden.join('/')} (called: ${describe(calls)})` };
}

function expectAnyOf(output: unknown, allowed: string[]): AssertionResult {
  const calls = parseToolCalls(output);
  const hit = calls.find((c) => allowed.includes(c.name));
  return hit
    ? { pass: true, score: 1, reason: `Routed to ${hit.name}` }
    : { pass: false, score: 0, reason: `Expected one of ${allowed.join('/')}, got ${describe(calls)}` };
}

// Single posting -> add_job, not the batch tool and not N sequential calls.
export function assertRoutesToAddJob(output: unknown): AssertionResult {
  const { pass, score, reason } = expectSingle(output, 'add_job');
  return { pass, score, reason };
}

// The description says "copied in full — do not summarize". Guard against the
// model helpfully condensing the posting before saving it, which is what
// downgrades a job to `partial` completeness and suppresses the match offer.
export function assertDescriptionNotSummarized(
  output: unknown,
  context: Context,
): AssertionResult {
  const calls = parseToolCalls(output);
  const source = context?.vars?.jobPosting ?? '';
  const sent = calls
    .flatMap((c) => (c.name === 'add_jobs_batch' ? (c.args.jobs ?? []) : [c.args]))
    .map((a: any) => String(a?.jobDescription ?? ''))
    .join('\n');
  if (!sent) {
    return { pass: false, score: 0, reason: 'No jobDescription was sent at all' };
  }
  const ratio = sent.length / Math.max(source.length, 1);
  return ratio >= 0.6
    ? { pass: true, score: 1, reason: `jobDescription kept ${(ratio * 100).toFixed(0)}% of source length` }
    : {
        pass: false,
        score: 0,
        reason: `jobDescription looks summarized: ${sent.length} chars vs ${source.length} in source (${(ratio * 100).toFixed(0)}%)`,
      };
}

// Several postings in one message -> one add_jobs_batch, not N add_job calls.
export function assertRoutesToAddJobsBatch(output: unknown): AssertionResult {
  const result = expectSingle(output, 'add_jobs_batch');
  if (!result.pass) return { pass: false, score: 0, reason: result.reason };
  const jobs = result.calls[0].args.jobs;
  if (!Array.isArray(jobs) || jobs.length !== 3) {
    return {
      pass: false,
      score: 0,
      reason: `Expected jobs[] of length 3, got ${Array.isArray(jobs) ? jobs.length : typeof jobs}`,
    };
  }
  return { pass: true, score: 1, reason: 'Routed to add_jobs_batch with 3 items' };
}

// Editing a tracked job must never go through the create path.
export function assertRoutesToUpdatePath(output: unknown): AssertionResult {
  const forbidden = expectNone(output, ['add_job', 'add_jobs_batch']);
  if (!forbidden.pass) return forbidden;
  return expectAnyOf(output, ['update_job', 'find_job']);
}

// Re-running a saved search: either check first with find_job, or add with
// upsert:true. Blindly calling add_job with neither is the regression.
export function assertDedupeAware(output: unknown): AssertionResult {
  const calls = parseToolCalls(output);
  if (calls.some((c) => c.name === 'find_job')) {
    return { pass: true, score: 1, reason: 'Checked with find_job first' };
  }
  const add = calls.find((c) => c.name === 'add_job' || c.name === 'add_jobs_batch');
  if (!add) {
    return { pass: false, score: 0, reason: `Expected find_job or an add with upsert, got ${describe(calls)}` };
  }
  const items = add.name === 'add_jobs_batch' ? (add.args.jobs ?? []) : [add.args];
  const allUpsert = items.length > 0 && items.every((i: any) => i?.upsert === true);
  return allUpsert
    ? { pass: true, score: 1, reason: `${add.name} called with upsert:true` }
    : { pass: false, score: 0, reason: `${add.name} called without upsert:true and without a find_job check` };
}

// The two-call flow: after add_job returns a match directive, the agent must
// keep going rather than stopping at the confirmation text. review_resume
// counts — the directive asks for a comparison against the default resume and
// that is the only tool exposing it, so fetching it first is correct, not a
// misroute. Re-adding the job, or replying with prose, is the regression.
export function assertFollowsMatchDirective(output: unknown): AssertionResult {
  const forbidden = expectNone(output, ['add_job', 'add_jobs_batch']);
  if (!forbidden.pass) return forbidden;
  return expectAnyOf(output, ['save_match_result', 'save_match_results_batch', 'review_resume']);
}

// A title-only posting carries no basis for a score; the directive withholds
// the offer, and the agent must not invent one anyway.
export function assertNoFabricatedMatch(output: unknown): AssertionResult {
  return expectNone(output, ['save_match_result', 'save_match_results_batch']);
}

export function assertRoutesToAddQuestion(output: unknown): AssertionResult {
  const { pass, score, reason } = expectSingle(output, 'add_question');
  return { pass, score, reason };
}

export function assertRoutesToReviewResume(output: unknown): AssertionResult {
  const { pass, score, reason } = expectSingle(output, 'review_resume');
  return { pass, score, reason };
}
