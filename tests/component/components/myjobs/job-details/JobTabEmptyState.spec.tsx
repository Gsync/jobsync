import { render, screen } from "@testing-library/react";
import { Briefcase } from "lucide-react";
import { JobTabEmptyState } from "@/components/myjobs/job-details/JobTabEmptyState";

describe("JobTabEmptyState", () => {
  it("renders the action when given a label and a handler", () => {
    render(
      <JobTabEmptyState
        icon={Briefcase}
        title="Nothing here"
        description="Add one."
        actionLabel="Add"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders no button without an action", () => {
    render(
      <JobTabEmptyState
        icon={Briefcase}
        title="Nothing here"
        description="Nothing to do."
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
