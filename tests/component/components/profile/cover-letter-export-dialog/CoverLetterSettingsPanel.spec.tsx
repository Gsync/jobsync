import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CoverLetterSettingsPanel } from "@/components/profile/cover-letter-export-dialog/CoverLetterSettingsPanel";
import { defaultCoverLetterExportSettings } from "@/models/coverLetterExport.model";

// The established shim for driving Radix Select in jsdom — see TaskForm.spec.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
});

const renderPanel = (
  patch: Partial<typeof defaultCoverLetterExportSettings> = {},
  props: { hasLetterhead?: boolean; headline?: string } = {},
) => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const onHeadlineChange = vi.fn();
  render(
    <CoverLetterSettingsPanel
      settings={{ ...defaultCoverLetterExportSettings, ...patch }}
      onChange={onChange}
      hasLetterhead={props.hasLetterhead ?? true}
      headline={props.headline ?? "Engineer"}
      onHeadlineChange={onHeadlineChange}
    />,
  );
  return { onChange, onHeadlineChange, user };
};

describe("CoverLetterSettingsPanel — structure", () => {
  it("has no Template row", () => {
    renderPanel();
    expect(
      screen.queryByRole("combobox", { name: "Template" }),
    ).not.toBeInTheDocument();
  });

  it("renders the two disclosure groups open", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /Typography/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Layout/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("renders one select and five steppers, prefixed cover-letter-export", () => {
    renderPanel();
    expect(screen.getByRole("combobox", { name: "Font" })).toBeInTheDocument();
    for (const field of [
      "fontSize",
      "lineHeight",
      "marginVertical",
      "marginHorizontal",
      "paragraphSpacing",
    ]) {
      expect(document.getElementById(`cover-letter-export-${field}`)).not.toBeNull();
    }
    expect(
      document.getElementById("cover-letter-export-sectionSpacing"),
    ).toBeNull();
  });
});

describe("CoverLetterSettingsPanel — emitting", () => {
  // A control that emitted only its own field would drop the other five.
  it("emits a whole settings object with only the changed field moved", async () => {
    const { onChange, user } = renderPanel();
    await user.click(
      screen.getByRole("button", { name: "Increase Paragraph spacing" }),
    );
    expect(onChange).toHaveBeenCalledWith({
      ...defaultCoverLetterExportSettings,
      paragraphSpacing: 11,
    });
  });

  it("clamps at the field's ceiling by disabling the button", () => {
    renderPanel({ paragraphSpacing: 24 });
    expect(
      screen.getByRole("button", { name: "Increase Paragraph spacing" }),
    ).toBeDisabled();
  });
});

describe("CoverLetterSettingsPanel — letterhead hint", () => {
  it("is hidden when the letterhead resolves", () => {
    renderPanel({}, { hasLetterhead: true });
    expect(screen.queryByText(/No letterhead/)).not.toBeInTheDocument();
  });

  it("explains the missing letterhead and how to fix it", () => {
    renderPanel({}, { hasLetterhead: false });
    expect(screen.getByText(/No letterhead/)).toBeInTheDocument();
    expect(screen.getByText(/default resume/)).toBeInTheDocument();
  });
});

describe("CoverLetterSettingsPanel — reset", () => {
  it("renders no reset button without an onReset handler", () => {
    renderPanel();
    expect(
      screen.queryByRole("button", { name: "Reset to defaults" }),
    ).not.toBeInTheDocument();
  });

  it("disables reset when the settings already equal the defaults", () => {
    render(
      <CoverLetterSettingsPanel
        settings={{ ...defaultCoverLetterExportSettings }}
        onChange={vi.fn()}
        onReset={vi.fn()}
        isDefault
        hasLetterhead
        headline=""
        onHeadlineChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reset to defaults" }),
    ).toBeDisabled();
  });
});

describe("CoverLetterSettingsPanel — headline", () => {
  it("shows the headline it is given", () => {
    renderPanel({}, { headline: "Staff Engineer" });
    expect(screen.getByLabelText("Headline")).toHaveValue("Staff Engineer");
  });

  it("emits the typed headline", async () => {
    const { onHeadlineChange, user } = renderPanel({}, { headline: "" });
    await user.type(screen.getByLabelText("Headline"), "X");
    expect(onHeadlineChange).toHaveBeenCalledWith("X");
  });

  // With no letterhead the field would edit nothing on the page.
  it("is hidden when there is no letterhead", () => {
    renderPanel({}, { hasLetterhead: false });
    expect(screen.queryByLabelText("Headline")).not.toBeInTheDocument();
  });
});
