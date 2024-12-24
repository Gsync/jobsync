import {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarClock,
  UserRound,
  Sheet,
} from "lucide-react";

export enum APP_CONSTANTS {
  RECORDS_PER_PAGE = 10,
  ACTIVITY_MAX_DURATION_MINUTES = 8 * 60, // 8 Hours
  ACTIVITY_MAX_DURATION_MS = 8 * 60 * 60 * 1000, // 8 hours in milliseconds
}

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
    icon: CalendarClock,
    route: "/dashboard/activities",
    label: "Activities",
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
];
