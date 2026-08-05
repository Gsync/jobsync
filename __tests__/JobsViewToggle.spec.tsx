import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobsViewToggle } from "@/components/myjobs/JobsViewToggle";

describe("JobsViewToggle", () => {
  const user = userEvent.setup();

  it("marks the active mode as pressed", () => {
    render(<JobsViewToggle value="cards" onChange={vi.fn()} />);

    expect(screen.getByTestId("jobs-view-cards-btn")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("jobs-view-table-btn")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the clicked mode", async () => {
    const onChange = vi.fn();
    render(<JobsViewToggle value="table" onChange={onChange} />);

    await user.click(screen.getByTestId("jobs-view-cards-btn"));

    expect(onChange).toHaveBeenCalledWith("cards");
  });

  it("still calls onChange when the already-active mode is clicked", async () => {
    const onChange = vi.fn();
    render(<JobsViewToggle value="table" onChange={onChange} />);

    await user.click(screen.getByTestId("jobs-view-table-btn"));

    expect(onChange).toHaveBeenCalledWith("table");
  });
});
