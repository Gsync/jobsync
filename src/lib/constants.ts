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
  ACTIVITY_MAX_DURATION_MINUTES: 8 * 60, // 8 Hours
  ACTIVITY_MAX_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  RECENT_NUM_JOBS_ACTIVITIES: 7,
  AI_SLOW_RESPONSE_THRESHOLD_MS: 15_000, // 15 seconds

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
    label: "My Jobs",
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
