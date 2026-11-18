import { AGENT_CHAT_RESUME_MAX_CHARS, type AgentInvalidation, type AgentToolMeta } from "@/models/agent.model";

export const AGENT_TOOL_META = {
  add_job: {
    kind: "write",
    description: "Add a job application to JobSync. Resolves or creates company, job title, location and source by name, and detects duplicates automatically. The user confirms the extracted details before anything is saved.",
    runningLabel: "Preparing to add a job…",
    terminal: true,
    invalidates: [],
  },
  get_resume: {
    kind: "read",
    description: "Read the contents of one of the user's own resumes in JobSync and return it as text. Use it to answer a question about what a resume says. Optionally takes the resume's title; with no title the app uses the resume the user is currently viewing, or their default resume. Returns their resume titles instead if it cannot tell which one they mean.",
    runningLabel: "Reading your resume…",
    terminal: false,
    invalidates: [],
    maxResultChars: AGENT_CHAT_RESUME_MAX_CHARS,
  },
  review_resume: {
    kind: "workflow",
    directInvoke: true,
    description: "Produce a full scored review of one of the user's own resumes in JobSync. The app generates the review itself, streams it to the user and saves it, then returns the scores and the review text to you. Optionally takes the resume's title; with no title the app uses the resume the user is currently viewing, or their default resume. Returns their resume titles instead if it cannot tell which one they mean.",
    runningLabel: "Reviewing your resume…",
    terminal: true,
    invalidates: ["page"],
  },
  match_job: {
    kind: "workflow",
    directInvoke: true,
    description: "Score how well one of the user's own resumes matches the job the user is currently viewing in JobSync, and save the result to that job. The app generates the analysis itself, streams it to the user and saves it, then returns the match score and the analysis text to you. Call it whenever the user asks about matching, fit, what is missing for a role, or whether to apply: each turn tells you which page they are on, so never ask them to open a job or confirm they have one open, and treat a no_job result from an earlier turn as stale rather than repeating it. Optionally takes the resume's title; with no title the app uses the resume linked to the job, or their default resume.",
    runningLabel: "Matching your resume to this job…",
    terminal: true,
    invalidates: ["page", "jobsList"],
  },
  generate_cover_letter: {
    kind: "workflow",
    directInvoke: true,
    description: "Write a cover letter for the job the user is currently viewing in JobSync, drawing on one of their own resumes, and save it to their documents. The app writes the letter itself, streams it to the user and saves it, then returns the letter text to you. Call it whenever the user asks for a cover letter, a covering letter, a letter of application or a note to send with an application: each turn tells you which page they are on, so never ask them to open a job or confirm they have one open, and treat a no_job result from an earlier turn as stale rather than repeating it. Optionally takes the resume's title; with no title the app uses the resume linked to the job, or their default resume.",
    runningLabel: "Writing your cover letter…",
    terminal: true,
    invalidates: ["page"],
  },
} as const satisfies Record<string, AgentToolMeta>;

export type AgentToolName = keyof typeof AGENT_TOOL_META;
export const AGENT_TOOL_NAMES: readonly AgentToolName[] =
  Object.keys(AGENT_TOOL_META) as AgentToolName[];

export function isAgentToolName(name: string): name is AgentToolName {
  return Object.hasOwn(AGENT_TOOL_META, name);
}

export type DirectInvokeToolName = {
  [Name in AgentToolName]: (typeof AGENT_TOOL_META)[Name] extends { directInvoke: true } ? Name : never;
}[AgentToolName];

export function isDirectInvokeTool(name: string): name is DirectInvokeToolName {
  return isAgentToolName(name) && "directInvoke" in AGENT_TOOL_META[name];
}

export function isNestedTool(name: string): boolean {
  return isAgentToolName(name) && AGENT_TOOL_META[name].kind === "workflow";
}

export const AGENT_NESTED_TOOLS: readonly AgentToolName[] = AGENT_TOOL_NAMES.filter(isNestedTool);
export const AGENT_CHAT_TERMINAL_TOOLS: readonly AgentToolName[] =
  AGENT_TOOL_NAMES.filter((name) => AGENT_TOOL_META[name].terminal);

export function toolInvalidates(name: string): readonly AgentInvalidation[] {
  return isAgentToolName(name) ? AGENT_TOOL_META[name].invalidates : [];
}
