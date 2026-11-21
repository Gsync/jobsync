import { AGENT_CHAT_RESUME_MAX_CHARS, type AgentInvalidation, type AgentToolMeta } from "@/models/agent.model";

export const AGENT_DATA_AREAS = ["saved jobs", "tasks", "notes", "activities", "settings"] as const;

export const AGENT_TOOL_META = {
  add_job: {
    kind: "write",
    description: "Save a job application when the user asks to add, save or track a job. Call as soon as you have the company, job title and either a pasted posting or a description of what the role involves. If any are missing, ask for all three together as required. One sentence about the role is enough. Never ask the user for optional fields. The app resolves or creates the company, job title, location and source by name and detects duplicates. When the result says the job was created, it is already saved. Answer follow-up questions from that result without asking the user to confirm again.",
    runningLabel: "Preparing to add a job…",
    steps: [
      { id: "resolve", label: "Resolving job details…" },
      { id: "duplicate", label: "Checking for an existing job…" },
      { id: "save", label: "Saving job…" },
    ],
    terminal: true,
    reads: [],
    invalidates: [],
  },
  get_resume: {
    kind: "read",
    description: "Read the contents of one of the user's own resumes in JobSync and return it as text. Use it to answer a question about what a resume says. Optionally takes the resume's title; with no title the app uses the resume the user is currently viewing, or their default resume. Returns their resume titles instead if it cannot tell which one they mean.",
    runningLabel: "Reading your resume…",
    steps: [],
    terminal: false,
    reads: [],
    invalidates: [],
    maxResultChars: AGENT_CHAT_RESUME_MAX_CHARS,
  },
  review_resume: {
    kind: "workflow",
    directInvoke: true,
    description: "Call when the user asks for a review, critique, feedback or score on one of their resumes. The app generates the scored review, streams it to the user and saves it. Use the returned scores and review text for follow-up questions. Without a resume title the app uses the resume the user is viewing or their default resume, and returns titles if it needs a selection.",
    runningLabel: "Reviewing your resume…",
    steps: [
      { id: "resume", label: "Loading resume…" },
      { id: "prepare", label: "Preparing resume text…" },
      { id: "generate", label: "Generating review…" },
      { id: "check", label: "Extracting scores…" },
      { id: "save", label: "Saving review…" },
    ],
    terminal: true,
    reads: [],
    invalidates: ["page"],
  },
  match_job: {
    kind: "workflow",
    directInvoke: true,
    description: "Call when the user asks how well their resume matches the job they are viewing, for a fit score, what is missing for the role, or whether to apply. The app generates the analysis, streams it to the user and saves it to the job. Use the returned match score and analysis for follow-up questions. Without a resume title the app uses the resume linked to the job or their default resume.",
    runningLabel: "Matching your resume to this job…",
    steps: [
      { id: "job", label: "Loading job…" },
      { id: "resume", label: "Loading resume…" },
      { id: "prepare", label: "Preparing resume and job text…" },
      { id: "generate", label: "Generating match…" },
      { id: "check", label: "Extracting scores…" },
      { id: "save", label: "Saving match…" },
    ],
    terminal: true,
    reads: [],
    invalidates: ["page", "jobsList"],
  },
  generate_cover_letter: {
    kind: "workflow",
    directInvoke: true,
    description: "Call when the user asks for a cover letter, a covering letter, a letter of application or a note to send with an application for the job they are viewing. The app writes the letter using one of their resumes, streams it to the user and saves it to their documents. Use the returned letter for follow-up questions. Without a resume title the app uses the resume linked to the job or their default resume.",
    runningLabel: "Writing your cover letter…",
    steps: [
      { id: "job", label: "Loading job…" },
      { id: "resume", label: "Loading resume…" },
      { id: "prepare", label: "Preparing resume and job text…" },
      { id: "generate", label: "Writing cover letter…" },
      { id: "save", label: "Saving cover letter…" },
    ],
    terminal: true,
    reads: [],
    invalidates: ["page"],
  },
} as const satisfies Record<string, AgentToolMeta>;

export type AgentToolName = keyof typeof AGENT_TOOL_META;
export type AgentToolStepId<Name extends AgentToolName> =
  (typeof AGENT_TOOL_META)[Name]["steps"][number]["id"];
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

export const AGENT_CHAT_TERMINAL_TOOLS: readonly AgentToolName[] =
  AGENT_TOOL_NAMES.filter((name) => AGENT_TOOL_META[name].terminal);

export function toolInvalidates(name: string): readonly AgentInvalidation[] {
  return isAgentToolName(name) ? AGENT_TOOL_META[name].invalidates : [];
}
