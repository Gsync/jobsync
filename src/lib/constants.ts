import {
  LayoutDashboard,
  SquareCheckBig,
  BriefcaseBusiness,
  CalendarClock,
  UserRound,
  Sheet,
  Wrench,
  Zap,
  BookOpen,
} from "lucide-react";

export const APP_CONSTANTS = {
  RECORDS_PER_PAGE: 25,
  MAX_AUTOMATIONS_PER_USER: 10,
  MAX_JOB_TAGS: 10,
  MIN_QUESTION_LENGTH: 5,
  MAX_QUESTION_LENGTH: 500,
  MIN_QUESTION_ANSWER_LENGTH: 10,
  MAX_QUESTION_ANSWER_LENGTH: 5000,
  MAX_SKILL_CATEGORIES: 8,
  MAX_SKILLS_PER_CATEGORY: 20,
  MIN_RESUME_SECTIONS_FOR_SELECTION: 2,
  ACTIVITY_MAX_DURATION_MINUTES: 8 * 60, // 8 Hours
  ACTIVITY_MAX_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  RECENT_NUM_JOBS_ACTIVITIES: 7,
  AI_SLOW_RESPONSE_THRESHOLD_MS: 15_000, // 15 seconds
  INTERSECTION_OBSERVER_THRESHOLD: 0.1,
  TOAST_LIMIT: 1,

  // Ollama API timeouts
  AI_OLLAMA_LIST_TIMEOUT_MS: 5_000,
  AI_OLLAMA_GENERATE_TIMEOUT_MS: 10_000,

  // Ollama context window (covers prompt + generation combined). Defaults to
  // 2048; even 4096 overflows for a full resume plus the system prompt and the
  // verbatim JSON output — truncating the tail of generation (e.g. the last
  // experience/certification entries get dropped).
  AI_OLLAMA_NUM_CTX: 8192,

  // Resume import generation timeout. Generous because a full resume streams a
  // few thousand tokens of verbatim JSON, which a local model can take minutes
  // to produce; too low and the stream is cut mid-entry.
  AI_RESUME_IMPORT_TIMEOUT_MS: 240_000,

  // Resume review generation timeout. The review is a full markdown analysis
  // (scores line plus several sections), so a local model can take minutes;
  // too low cuts the stream mid-review.
  AI_RESUME_REVIEW_TIMEOUT_MS: 180_000,

  // Job match generation timeout. Like the review, the match is a markdown
  // analysis (scores line plus several sections) over a resume and a JD, so a
  // local model can take minutes; too low cuts the stream mid-analysis.
  AI_JOB_MATCH_TIMEOUT_MS: 180_000,

  // Automation manual run rate limiting
  AUTOMATION_MAX_MANUAL_RUNS_PER_HOUR: 5,
  AUTOMATION_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour

  // Per-run LLM match budget (top-K). Reused as the Greenhouse K.
  MAX_JOBS_PER_RUN: 10,

  // Greenhouse job source
  GREENHOUSE_BASE_URL: "https://boards-api.greenhouse.io/v1/boards",
  MAX_GREENHOUSE_COMPANIES: 25, // per automation
  GREENHOUSE_LISTING_CAP: 50, // safety ceiling applied after the relevance floor
  GREENHOUSE_FLOOR_MIN_TITLE_HITS: 1,
  GREENHOUSE_FLOOR_MIN_KEYWORD_HITS: 2,
  GREENHOUSE_TITLE_WEIGHT: 0.6,
  GREENHOUSE_SKILL_WEIGHT: 0.4,
  GREENHOUSE_FETCH_TIMEOUT_MS: 25_000, // per-board AbortController timeout
  GREENHOUSE_FETCH_CONCURRENCY: 5,

  // MCP server settings
  MCP_DUPLICATE_WINDOW_DAYS: 30,
  MCP_TOKEN_EXPIRY_PRESETS: [30, 90, 365] as const,
  MCP_TOKEN_EXPIRY_DEFAULT_DAYS: 90,
  MCP_TOKEN_MAX_PER_USER: 10,
  MCP_RATE_LIMIT_MAX: 30,
  MCP_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000,
  MCP_DEFAULT_JOB_TYPE: "Full-time",
  MCP_DEFAULT_STATUS: "draft",

  // File uploads
  UPLOADS_DIR: process.env.NODE_ENV !== "production" ? "data" : "/data",
  MAX_RESUME_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  RESUME_ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ] as const,

  // Resume import extraction limits
  RESUME_IMPORT_MAX_PDF_PAGES: 5,
  RESUME_IMPORT_MAX_EXTRACTED_CHARS: 50_000,
  RESUME_IMPORT_MAX_DOCX_ENTRIES: 1_000,
  RESUME_IMPORT_MAX_DOCX_UNCOMPRESSED_BYTES: 100 * 1024 * 1024, // 100 MB
  RESUME_IMPORT_EXTRACT_TIMEOUT_MS: 30_000, // 30 seconds
} as const;

export const SCHEDULER_CONSTANTS = {
  ENABLED: true,
  CRON_EXPRESSION: "0 * * * *", // Every hour at minute 0
  STALE_RUN_TIMEOUT_MS: 15 * 60 * 1000, // 15 min; reaper cutoff for stuck runs
} as const;

export const JOB_SOURCES = [
  { label: "Indeed", value: "indeed" },
  { label: "Linkedin", value: "linkedin" },
  { label: "Monster", value: "monster" },
  { label: "Glassdoor", value: "glassdoor" },
  { label: "Company Career page", value: "careerpage" },
  { label: "Google", value: "google" },
  { label: "ZipRecruiter", value: "ziprecruiter" },
  { label: "Job Street", value: "jobstreet" },
  { label: "Other", value: "other" },
] as const;

export const JOB_STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
  { label: "Archived", value: "archived" },
] as const;

export const SIDEBAR_LINKS = [
  {
    icon: LayoutDashboard,
    route: "/dashboard",
    label: "Dashboard",
  },
  {
    icon: BriefcaseBusiness,
    route: "/dashboard/myjobs",
    label: "Jobs",
  },
  {
    icon: Zap,
    route: "/dashboard/automations",
    label: "Automations",
  },
  {
    icon: SquareCheckBig,
    route: "/dashboard/tasks",
    label: "Tasks",
  },
  {
    icon: CalendarClock,
    route: "/dashboard/activities",
    label: "Activities",
  },
  {
    icon: BookOpen,
    route: "/dashboard/questions",
    label: "Question Bank",
  },
  {
    icon: UserRound,
    route: "/dashboard/profile",
    label: "Profile",
  },
  {
    icon: Sheet,
    route: "/dashboard/admin",
    label: "Administration",
  },
  {
    icon: Wrench,
    route: "/dashboard/developer",
    label: "Developer Options",
    devOnly: true,
  },
];
