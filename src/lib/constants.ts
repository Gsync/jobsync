import {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarClock,
  UserRound,
  Sheet,
} from "lucide-react";

export enum APP_CONSTANTS {
  RECORDS_PER_PAGE = 10,
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
