// Tool descriptions are prompt surface, not documentation: the agent routes
// between add_job / update_job / add_jobs_batch on this text alone. Kept out
// of route.ts so evals/mcp-tools can assert against the exact strings the
// server registers instead of a copy that silently drifts.
export const MCP_TOOL_DESCRIPTIONS = {
  add_job:
    "Add a job application to JobSync. Resolves or creates company, job title, location, and source by name. Returns a transparency report of what was matched vs. created.",
  find_job:
    "Look up whether a job posting is already saved in JobSync, by URL and/or by company and job title (optionally location). Returns every match of any age and status, including applied and withdrawn jobs. Call this before add_job when re-running a search; job board links often change between searches, so pass company and jobTitle too, not only the URL.",
  list_jobs:
    "List saved jobs as compact rows (id, company, title, location, status, saved date), newest first, filtered by company, status, source or createdAfter, with offset paging. Read-only. Use it once at the start of a scheduled run to load what is already tracked.",
  update_job:
    "Correct or enrich a job previously added through MCP. Only the fields you supply change. Supplying a fuller jobDescription re-classifies the posting and requests a fresh match analysis — use this instead of re-adding with allowDuplicate.",
  add_question:
    "Add one interview question to the Question Bank, with the user's answer if they gave one and skill tags. The bank is checked first: a question already saved is never saved twice, and similar saved questions come back for you to confirm with the user before re-calling. Use add_questions_batch for several questions.",
  add_questions_batch:
    "Add up to 20 interview questions in one call, each with add_question's fields and the same duplicate check; returns one labelled result per question. Use this for all the questions from one interview instead of N add_question calls.",
  save_match_result:
    "Persist a job-fit match analysis (produced by you, the agent) against a job previously created with add_job. Call this after add_job hands you a match directive.",
  add_jobs_batch:
    "Add several jobs in one call. Same per-item behaviour as add_job (including upsert and the match directive); returns one labelled result per item. Use this for scheduled runs instead of N sequential add_job calls.",
  save_match_results_batch:
    "Persist several job-fit match analyses in one call. Same per-item behaviour as save_match_result; returns one labelled result per item.",
  review_resume:
    "Fetch the user's default resume so you can review it. Returns the normalized resume text plus a directive — produce the review yourself, then call save_resume_review with the result.",
  save_resume_review:
    "Persist a resume review (produced by you, the agent) against the resume previously handed to you by review_resume. Call this after review_resume hands you a review directive.",
} as const;

export type McpToolName = keyof typeof MCP_TOOL_DESCRIPTIONS;
