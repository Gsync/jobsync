// Tool descriptions are prompt surface, not documentation: the agent routes
// between add_job / update_job / add_jobs_batch on this text alone. Kept out
// of route.ts so evals/mcp-tools can assert against the exact strings the
// server registers instead of a copy that silently drifts.
export const MCP_TOOL_DESCRIPTIONS = {
  add_job:
    "Add a job application to JobSync. Resolves or creates company, job title, location, and source by name. Returns a transparency report of what was matched vs. created.",
  find_job:
    "Look up whether a job posting is already saved in JobSync, by URL. Call this before add_job when re-running a search. With no URL to look up, use add_job's upsert instead of skipping dedupe.",
  update_job:
    "Correct or enrich a job previously added through MCP. Only the fields you supply change. Supplying a fuller jobDescription re-classifies the posting and requests a fresh match analysis — use this instead of re-adding with allowDuplicate.",
  add_question:
    "Add an entry to the Question Bank. Resolves or creates tags by name. Returns a transparency report of what was matched vs. created.",
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
  list_jobs:
    "List the user's saved jobs with optional filters (search, status, company, applied) and pagination. Returns compact one-line summaries with ids, status, location, match score, tags and url. Use get_job for full details. Use this to browse/search the job list before acting.",
  get_job:
    "Fetch the full record for a single saved job by id (description, tags, contacts, stages, match data, resume/cover letter, url). Use after list_jobs or add_job to read or enrich a posting.",
  delete_job:
    "Delete a job previously created via MCP (createdVia set). Jobs created in the web app cannot be deleted through MCP — delete them there instead.",
  list_companies:
    "List the user's companies (with job counts and watchlist/ATS info). Supports free-text search and pagination. Use to resolve company names or inspect the company list.",
  list_resumes:
    "List the user's resumes (id + title), marking the default one. Use to pick a resumeId for save_match_result / review_resume flows.",
  get_job_stats:
    "Aggregate counts of the user's jobs by status plus total and applied counts. Use for a quick pipeline overview.",
} as const;

export type McpToolName = keyof typeof MCP_TOOL_DESCRIPTIONS;
