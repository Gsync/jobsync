import { SegmentedRadio } from "@/components/myjobs/add-job/SegmentedRadio";
import { StatusSegment } from "@/components/myjobs/add-job/StatusSegment";
import { JOB_STATUSES } from "@/lib/constants";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const opts = [
  { value: "REMOTE", label: "Remote" },
  { value: "ONSITE", label: "Onsite" },
];
const statuses = JOB_STATUSES.map((s) => ({ id: "id-" + s.value, ...s }));
const idOf = (v: string) => "id-" + v;

describe("SegmentedRadio", () => {
  const user = userEvent.setup({ skipHover: true });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  it("checks the segment matching value and reports a click", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedRadio
        aria-label="Workplace"
        options={opts}
        value="ONSITE"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radio", { name: "Onsite" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Remote" }));
    expect(onValueChange).toHaveBeenCalledWith("REMOTE");
  });

  it("checks nothing when value is undefined", () => {
    render(
      <SegmentedRadio
        aria-label="Workplace"
        options={opts}
        onValueChange={vi.fn()}
      />,
    );
    screen
      .getAllByRole("radio")
      .forEach((r) => expect(r).not.toBeChecked());
  });
});

describe("StatusSegment", () => {
  const user = userEvent.setup({ skipHover: true });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  it("shows a More status's label on the trigger and no primary checked", () => {
    render(
      <StatusSegment
        statuses={statuses}
        value={idOf("rejected")}
        onValueChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Rejected.*selected/ }),
    ).toBeInTheDocument();
    screen
      .getAllByRole("radio")
      .forEach((r) => expect(r).not.toBeChecked());
  });

  it("picks a status from More", async () => {
    const onValueChange = vi.fn();
    render(
      <StatusSegment
        statuses={statuses}
        value={idOf("draft")}
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("menuitem", { name: "Withdrawn" }));
    expect(onValueChange).toHaveBeenCalledWith(idOf("withdrawn"));
  });
});
