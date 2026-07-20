import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { APP_CONSTANTS } from "@/lib/constants";

function makeWrapper(initialExpanded: boolean) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SidebarProvider initialExpanded={initialExpanded}>
        {children}
      </SidebarProvider>
    );
  };
}

describe("SidebarContext", () => {
  beforeEach(() => {
    // Clear any cookie left over from a previous test's toggle().
    document.cookie = `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=; path=/; max-age=0`;
  });

  it("uses the initialExpanded value passed in", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: makeWrapper(true),
    });

    expect(result.current.expanded).toBe(true);
  });

  it("respects a false initialExpanded value", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: makeWrapper(false),
    });

    expect(result.current.expanded).toBe(false);
  });

  it("persists the state as a cookie when toggled", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: makeWrapper(true),
    });

    act(() => result.current.toggle());

    expect(result.current.expanded).toBe(false);
    expect(document.cookie).toContain(
      `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=false`
    );

    act(() => result.current.toggle());

    expect(result.current.expanded).toBe(true);
    expect(document.cookie).toContain(
      `${APP_CONSTANTS.SIDEBAR_STORAGE_KEY}=true`
    );
  });

  it("toggles on Cmd/Ctrl+B", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useSidebar(), {
      wrapper: makeWrapper(true),
    });

    await user.keyboard("{Meta>}b{/Meta}");
    expect(result.current.expanded).toBe(false);

    await user.keyboard("{Control>}b{/Control}");
    expect(result.current.expanded).toBe(true);
  });

  it("ignores a bare 'b' keypress", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useSidebar(), {
      wrapper: makeWrapper(true),
    });

    await user.keyboard("b");

    expect(result.current.expanded).toBe(true);
  });

  // Tiptap binds Mod-b to bold; the sidebar shortcut must not steal it.
  it("ignores Cmd/Ctrl+B while focus is in an editable element", async () => {
    const user = userEvent.setup();

    function Consumer() {
      const { expanded } = useSidebar();
      return (
        <>
          <span>{expanded ? "expanded" : "collapsed"}</span>
          <input aria-label="note" />
        </>
      );
    }

    render(
      <SidebarProvider initialExpanded={true}>
        <Consumer />
      </SidebarProvider>
    );

    await user.click(screen.getByLabelText("note"));
    await user.keyboard("{Meta>}b{/Meta}");

    expect(screen.getByText("expanded")).toBeInTheDocument();
  });

  it("throws when used outside the provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function Orphan() {
      useSidebar();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(
      "useSidebar must be used within a SidebarProvider"
    );

    consoleError.mockRestore();
  });

  it("shares one state across consumers", async () => {
    const user = userEvent.setup();

    function Consumer() {
      const { expanded, toggle } = useSidebar();
      return (
        <>
          <span>{expanded ? "expanded" : "collapsed"}</span>
          <button onClick={toggle}>toggle</button>
        </>
      );
    }

    render(
      <SidebarProvider initialExpanded={true}>
        <Consumer />
        <Consumer />
      </SidebarProvider>
    );

    expect(screen.getAllByText("expanded")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "toggle" })[0]);

    expect(screen.getAllByText("collapsed")).toHaveLength(2);
  });
});
