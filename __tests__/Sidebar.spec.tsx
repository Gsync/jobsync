import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { Briefcase } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SidebarToggle from "@/components/SidebarToggle";
import NavLink from "@/components/NavLink";
import { SidebarProvider } from "@/context/SidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONSTANTS } from "@/lib/constants";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}));

const renderSidebar = () =>
  render(
    <SidebarProvider initialExpanded>
      <Sidebar />
      <SidebarToggle />
    </SidebarProvider>
  );

describe("NavLink - active state", () => {
  const renderNavLink = (route: string, pathname: string) =>
    render(
      <TooltipProvider>
        <NavLink
          label="Jobs"
          Icon={Briefcase}
          route={route}
          pathname={pathname}
          expanded
        />
      </TooltipProvider>
    );

  it("marks the link active on an exact route match", () => {
    renderNavLink("/dashboard/myjobs", "/dashboard/myjobs");

    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("marks the link active on a nested route", () => {
    renderNavLink("/dashboard/myjobs", "/dashboard/myjobs/job-123");

    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  // "/dashboard" is a prefix of every other route, so it must not match them.
  it("does not mark the dashboard link active on other pages", () => {
    renderNavLink("/dashboard", "/dashboard/myjobs");

    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("does not match a route that is only a string prefix", () => {
    renderNavLink("/dashboard/job", "/dashboard/jobs");

    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });
});

describe("NavLink - label rendering", () => {
  const renderNavLink = (expanded: boolean) =>
    render(
      <TooltipProvider>
        <NavLink
          label="Jobs"
          Icon={Briefcase}
          route="/dashboard/myjobs"
          pathname="/dashboard"
          expanded={expanded}
        />
      </TooltipProvider>
    );

  it("shows a visible label when expanded", () => {
    renderNavLink(true);

    expect(screen.getByText("Jobs")).not.toHaveClass("sr-only");
  });

  // A hidden-but-in-flow label takes flex space and pushes the icon
  // off-center in the collapsed rail, so it must be sr-only there.
  it("keeps the label screen-reader-only when collapsed", () => {
    renderNavLink(false);

    expect(screen.getByText("Jobs")).toHaveClass("sr-only");
  });

  it("keeps an accessible name in both states", () => {
    const { unmount } = renderNavLink(false);
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
    unmount();

    renderNavLink(true);
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
  });
});

describe("Sidebar", () => {
  beforeEach(() => {
    document.cookie = `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=; path=/; max-age=0`;
    (usePathname as any).mockReturnValue("/dashboard");
  });

  it("renders a link for each nav item plus settings", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/dashboard/myjobs"
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/dashboard/settings"
    );
  });

  it("marks the current page with aria-current", () => {
    (usePathname as any).mockReturnValue("/dashboard/tasks");

    renderSidebar();

    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: "Dashboard" })
    ).not.toHaveAttribute("aria-current");
  });

  it("does not render a collapse control inside the sidebar", () => {
    renderSidebar();

    // The only toggle lives in the header; the rail is nav links only.
    expect(
      screen.getByRole("complementary").querySelector("button")
    ).toBeNull();
  });
});

describe("SidebarToggle", () => {
  beforeEach(() => {
    document.cookie = `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=; path=/; max-age=0`;
    (usePathname as any).mockReturnValue("/dashboard");
  });

  it("collapses and expands the sidebar", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);

    const expandToggle = screen.getByRole("button", {
      name: "Expand sidebar",
    });
    expect(expandToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(expandToggle);

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("hides nav labels visually when collapsed", async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getByText("Jobs")).not.toHaveClass("sr-only");

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByText("Jobs")).toHaveClass("sr-only");
  });

  it("persists the collapsed state as a cookie", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(document.cookie).toContain(
      `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=false`
    );
  });

  it("points aria-controls at the sidebar element", () => {
    renderSidebar();

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    const target = toggle.getAttribute("aria-controls");

    expect(document.getElementById(target!)).toBe(
      screen.getByRole("complementary")
    );
  });
});
