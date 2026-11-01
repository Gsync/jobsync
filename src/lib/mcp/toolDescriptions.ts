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
    "List/search the user's saved jobs. Optional filters: search (free text across title, company, location, source, description), status (application status, case-insensitive contains, e.g. 'applied', 'draft', 'interview'), company (contains), applied (boolean). Paginate with limit (default 25, max 100) and offset. Returns one compact line per job: title, company, id, status, location, applied, match score, tags, url, plus total count and a 'more available' hint. Use get_job with an id for the full record (description, contacts, stages, match data). Use this to browse the job list, find a jobId, or check whether a role was already saved before adding it.",
  get_job:
    "Fetch the full record for one saved job by id: title, company, status, location, source, type, workplace, salary, applied/appliedDate, dueDate, match score, tags, contacts, interview stages, resume/cover letter, url, createdVia, and the full job description. Use after list_jobs or add_job to read, review, or enrich a posting. Only returns jobs owned by the caller.",
  delete_job:
    "Delete a job by id. Only jobs created through MCP (createdVia set) can be deleted this way; jobs created in the web app cannot be removed via MCP — tell the user to delete them in the app. Returns a confirmation with the job title/company.",
  list_companies:
    "List the user's companies with job counts, watchlist flag and ATS board info. Supports free-text search (name or ATS token) and pagination (limit default 50, max 200; offset). Use to resolve a company name to an id, inspect the company list, or check which boards are linked before running an automation.",
  list_resumes:
    "List the user's resumes (id + title + last-updated), marking the default one. Use to pick a resumeId for save_match_result / review_resume, or to confirm which resume exists before reviewing. Returns 'No resumes found' if none exist.",
  get_job_stats:
    "Aggregate pipeline overview: total jobs, applied count, and counts grouped by application status (new, draft, applied, interview, offer, rejected, etc.). Use for a quick summary of the job pipeline before deciding what to work on.",
} as const;

export type McpToolName = keyof typeof MCP_TOOL_DESCRIPTIONS;
