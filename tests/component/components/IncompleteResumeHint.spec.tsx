import { render, screen } from "@testing-library/react";
import { IncompleteResumeHint } from "@/components/IncompleteResumeHint";
import { buildIncompleteResumeHint } from "@/lib/resumeSections";

describe("IncompleteResumeHint", () => {
  it("exposes the hint as the accessible name of the icon", () => {
    render(<IncompleteResumeHint />);

    const icon = screen.getByRole("img", { name: buildIncompleteResumeHint() });
    expect(icon.parentElement).toHaveAttribute("data-incomplete-hint");
  });

  it("opts back into pointer events so it works inside a disabled item", () => {
    render(<IncompleteResumeHint />);

    const icon = screen.getByRole("img", { name: buildIncompleteResumeHint() });
    expect(icon.parentElement).toHaveClass("pointer-events-auto");
  });
});
