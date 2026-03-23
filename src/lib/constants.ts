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
import type { TranslationKey } from "@/i18n";

export const APP_CONSTANTS = {
  RECORDS_PER_PAGE: 25,
  RECORDS_PER_PAGE_OPTIONS: [25, 50, 100],
  ACTIVITY_MAX_DURATION_MINUTES: 8 * 60, // 8 Hours
  ACTIVITY_MAX_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  RECENT_NUM_JOBS_ACTIVITIES: 7,
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

export const SIDEBAR_LINKS: {
  icon: typeof LayoutDashboard;
  route: string;
  label: string;
  labelKey: TranslationKey;
  devOnly?: boolean;
}[] = [
  {
    icon: LayoutDashboard,
    route: "/dashboard",
    label: "Dashboard",
    labelKey: "nav.dashboard",
  },
  {
    icon: BriefcaseBusiness,
    route: "/dashboard/myjobs",
    label: "My Jobs",
    labelKey: "nav.myJobs",
  },
  {
    icon: Zap,
    route: "/dashboard/automations",
    label: "Automations",
    labelKey: "nav.automations",
  },
  {
    icon: SquareCheckBig,
    route: "/dashboard/tasks",
    label: "Tasks",
    labelKey: "nav.tasks",
  },
  {
    icon: CalendarClock,
    route: "/dashboard/activities",
    label: "Activities",
    labelKey: "nav.activities",
  },
  {
    icon: BookOpen,
    route: "/dashboard/questions",
    label: "Question Bank",
    labelKey: "nav.questionBank",
  },
  {
    icon: UserRound,
    route: "/dashboard/profile",
    label: "Profile",
    labelKey: "nav.profile",
  },
  {
    icon: Sheet,
    route: "/dashboard/admin",
    label: "Administration",
    labelKey: "nav.administration",
  },
  {
    icon: Wrench,
    route: "/dashboard/developer",
    label: "Developer Options",
    labelKey: "nav.developerOptions",
    devOnly: true,
  },
];
