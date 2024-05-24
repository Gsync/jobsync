import {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarClock,
  UserRound,
  LineChart,
} from "lucide-react";

export const SIDEBAR_LINKS = [
  {
    icon: LayoutDashboard,
    route: "/",
    label: "Dashboard",
  },
  {
    icon: BriefcaseBusiness,
    route: "/myjobs",
    label: "My Jobs",
  },
  {
    icon: CalendarClock,
    route: "/activities",
    label: "Activities",
  },
  {
    icon: UserRound,
    route: "/profile",
    label: "Profile",
  },
  {
    icon: LineChart,
    route: "#",
    label: "Analytics",
  },
];
