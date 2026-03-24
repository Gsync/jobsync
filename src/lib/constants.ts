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

export const JOB_SOURCES: {
  label: string;
  value: string;
  labelKey: TranslationKey;
}[] = [
  { label: "Indeed", value: "indeed", labelKey: "jobs.sourceIndeed" },
  { label: "Linkedin", value: "linkedin", labelKey: "jobs.sourceLinkedin" },
  { label: "Monster", value: "monster", labelKey: "jobs.sourceMonster" },
  { label: "Glassdoor", value: "glassdoor", labelKey: "jobs.sourceGlassdoor" },
  { label: "Company Career page", value: "careerpage", labelKey: "jobs.sourceCareerPage" },
  { label: "Google", value: "google", labelKey: "jobs.sourceGoogle" },
  { label: "ZipRecruiter", value: "ziprecruiter", labelKey: "jobs.sourceZipRecruiter" },
  { label: "Job Street", value: "jobstreet", labelKey: "jobs.sourceJobStreet" },
  { label: "Other", value: "other", labelKey: "jobs.sourceOther" },
];

export const JOB_STATUSES: {
  label: string;
  value: string;
  labelKey: TranslationKey;
}[] = [
  { label: "Draft", value: "draft", labelKey: "jobs.statusDraft" },
  { label: "Applied", value: "applied", labelKey: "jobs.statusApplied" },
  { label: "Interview", value: "interview", labelKey: "jobs.statusInterview" },
  { label: "Offer", value: "offer", labelKey: "jobs.statusOffer" },
  { label: "Rejected", value: "rejected", labelKey: "jobs.statusRejected" },
  { label: "Expired", value: "expired", labelKey: "jobs.statusExpired" },
  { label: "Archived", value: "archived", labelKey: "jobs.statusArchived" },
];

/**
 * Returns true when mock-data / developer tools should be accessible.
 * Enabled automatically in development mode, or when
 * NEXT_PUBLIC_ENABLE_MOCK_DATA=true is set in .env.
 */
export function isMockDataEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true"
  );
}

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
