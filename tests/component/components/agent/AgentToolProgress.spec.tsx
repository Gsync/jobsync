import { render, screen, within } from "@testing-library/react";
import {
  AgentToolProgress,
  type AgentToolProgressProps,
} from "@/components/agent/AgentToolProgress";

const ALL_REVIEW = ["resume", "prepare", "generate", "check", "save"];

function setup(overrides: Partial<AgentToolProgressProps> = {}) {
  return render(
    <AgentToolProgress
      toolName="review_resume"
      steps={["resume", "prepare"]}
      section="before"
      running={false}
      streaming={false}
      {...overrides}
    />,
  );
}

const marks = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-mark]")].map((el) =>
    el.getAttribute("data-mark"),
  );

describe("AgentToolProgress", () => {
  it("lists the reported steps", () => {
    setup();
    expect(screen.getByText("Loading resume…")).toBeInTheDocument();
    expect(screen.getByText("Preparing resume text…")).toBeInTheDocument();
    expect(screen.queryByText("Generating review…")).not.toBeInTheDocument();
  });

  it("shows only the reported steps", () => {
    const steps = ["resume", "prepare", "generate", "save"];
    const before = setup({ steps, section: "before" });
    const after = setup({ steps, section: "after" });
    expect(before.container.querySelectorAll("li")).toHaveLength(3);
    expect(after.container.querySelectorAll("li")).toHaveLength(1);
    expect(screen.queryByText("Extracting scores…")).not.toBeInTheDocument();
  });

  it("splits steps at generate", () => {
    const before = setup({ steps: ALL_REVIEW, section: "before" });
    expect(before.container.querySelectorAll("li")).toHaveLength(3);
    const after = setup({ steps: ALL_REVIEW, section: "after" });
    expect(after.container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders all add_job steps after the body", () => {
    const steps = ["resolve", "duplicate", "save"];
    const before = setup({ toolName: "add_job", steps, section: "before" });
    expect(before.container).toBeEmptyDOMElement();
    const after = setup({ toolName: "add_job", steps, section: "after" });
    expect(after.container.querySelectorAll("li")).toHaveLength(3);
  });

  it("spins only the current step while running", () => {
    const { container } = setup({ running: true });
    expect(marks(container)).toEqual(["done", "running"]);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[1]).toHaveAttribute("aria-current", "step");
  });

  it("labels the list for assistive tech", () => {
    setup();
    expect(
      screen.getByRole("list", { name: "Reviewing your resume progress" }),
    ).toBeInTheDocument();
  });

  it("marks a failed outcome with a red cross on the last step", () => {
    const { container } = setup({ outcome: "failed" });
    expect(marks(container)).toEqual(["done", "failed"]);
    expect(container.querySelector('[data-mark="failed"]')).toHaveClass(
      "text-destructive",
    );
    expect(screen.getAllByRole("listitem")[1]).not.toHaveAttribute("aria-current");
  });

  it("marks a timed-out outcome and says Timed out.", () => {
    const { container } = setup({ outcome: "timedOut" });
    expect(marks(container)).toEqual(["done", "timedOut"]);
    expect(screen.getByText("Timed out.")).toBeInTheDocument();
  });

  it("marks an interrupted step and says Interrupted.", () => {
    const { container } = setup({ stopped: "interrupted" });
    expect(marks(container)).toEqual(["done", "interrupted"]);
    expect(screen.getByText("Interrupted.")).toBeInTheDocument();
  });

  it("marks a turn timeout and says Timed out.", () => {
    const { container } = setup({ stopped: "timedOut" });
    expect(marks(container)).toEqual(["done", "timedOut"]);
    expect(screen.getByText("Timed out.")).toBeInTheDocument();
  });

  it("lets a turn timeout replace a failed outcome only", () => {
    const failed = setup({ stopped: "timedOut", outcome: "failed" });
    expect(marks(failed.container)).toEqual(["done", "timedOut"]);
    const ok = setup({ stopped: "timedOut", outcome: "ok" });
    expect(marks(ok.container)).toEqual(["done", "done"]);
    const answer = setup({ stopped: "timedOut", outcome: "answer" });
    expect(marks(answer.container)).toEqual(["done", "answer"]);
  });

  it("ends an answer on a neutral mark", () => {
    const { container } = setup({ outcome: "answer" });
    expect(marks(container)).toEqual(["done", "answer"]);
    expect(screen.queryByText("Timed out.")).not.toBeInTheDocument();
  });

  it("ends an ok outcome on a tick", () => {
    const { container } = setup({ outcome: "ok" });
    expect(marks(container)).toEqual(["done", "done"]);
  });

  it("colours marks by state", () => {
    const last = (props: Partial<AgentToolProgressProps>) => {
      const { container } = setup(props);
      const all = container.querySelectorAll("[data-mark]");
      return all[all.length - 1];
    };
    expect(last({ outcome: "ok" })).toHaveClass("text-green-600", "dark:text-green-500");
    expect(last({ running: true })).toHaveClass("text-orange-600", "dark:text-orange-500");
    expect(last({ outcome: "failed" })).toHaveClass("text-destructive");
    expect(last({ outcome: "timedOut" })).toHaveClass("text-destructive");
    for (const props of [{ stopped: "interrupted" as const }, { outcome: "answer" as const }]) {
      expect(last(props).getAttribute("class")).not.toMatch(
        /text-(green|orange|destructive)/,
      );
    }
  });

  it("keeps labels muted whatever the state", () => {
    setup({ outcome: "failed" });
    const item = screen.getAllByRole("listitem")[1];
    expect(within(item).getByText("Preparing resume text…")).toHaveClass(
      "text-muted-foreground",
    );
  });
});
