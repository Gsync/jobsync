import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ExportSettingsPanel } from "@/components/profile/export-pdf-dialog/ExportSettingsPanel";
import { defaultResumeExportSettings } from "@/models/resumeExport.model";

// The established shim for driving Radix Select in jsdom — see TaskForm.spec.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
});

const renderPanel = (patch: Partial<typeof defaultResumeExportSettings> = {}) => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <ExportSettingsPanel
      settings={{ ...defaultResumeExportSettings, ...patch }}
      onChange={onChange}
    />,
  );
  return { onChange, user };
};

describe("ExportSettingsPanel — structure", () => {
  it("pins Template above the two disclosure groups", () => {
    renderPanel();
    expect(screen.getByRole("combobox", { name: "Template" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Typography/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Layout/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("renders a select for each named setting and a stepper for each number", () => {
    renderPanel();
    expect(screen.getByRole("combobox", { name: "Template" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Font" })).toBeInTheDocument();
    for (const label of [
      "Font size",
      "Line height",
      "Margin top/bottom",
      "Margin left/right",
      "Section spacing",
      "Entry spacing",
    ]) {
      expect(screen.getByRole("spinbutton", { name: label })).toBeInTheDocument();
    }
  });

  it("shows the current value in every control", () => {
    renderPanel({ template: "professional", font: "times", fontSize: 12.5 });
    expect(screen.getByRole("combobox", { name: "Template" })).toHaveTextContent(
      "Professional",
    );
    expect(screen.getByRole("combobox", { name: "Font" })).toHaveTextContent(
      "Times",
    );
    expect(screen.getByRole("spinbutton", { name: "Font size" })).toHaveValue(
      12.5,
    );
    expect(
      screen.getByRole("spinbutton", { name: "Margin left/right" }),
    ).toHaveValue(48);
  });

  it("gives each stepper its field's own bounds and step", () => {
    renderPanel();
    const size = screen.getByRole("spinbutton", { name: "Font size" });
    expect(size).toHaveAttribute("min", "8");
    expect(size).toHaveAttribute("max", "16");
    expect(size).toHaveAttribute("step", "0.5");
    const line = screen.getByRole("spinbutton", { name: "Line height" });
    expect(line).toHaveAttribute("step", "0.05");
  });
});

describe("ExportSettingsPanel — disclosure", () => {
  it("hides a collapsed group's rows behind a value summary", async () => {
    const { user } = renderPanel();

    await user.click(screen.getByRole("button", { name: /Layout/ }));

    expect(
      screen.queryByRole("spinbutton", { name: "Section spacing" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("40 × 48 pt margins • 6/8 pt spacing"),
    ).toBeInTheDocument();
  });

  it("summarises Typography with all three of its values", async () => {
    const { user } = renderPanel({ font: "courier", fontSize: 9.5 });

    await user.click(screen.getByRole("button", { name: /Typography/ }));

    expect(screen.getByText("Courier • 9.5 pt • 1.4 line")).toBeInTheDocument();
  });

  it("does not show a summary while the group is open", () => {
    renderPanel();
    expect(
      screen.queryByText(/40 × 48 pt margins/),
    ).not.toBeInTheDocument();
  });
});

describe("ExportSettingsPanel — stepper buttons", () => {
  it("steps a value up by its own step, emitting the whole object", async () => {
    const { onChange, user } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Increase Font size" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultResumeExportSettings,
      fontSize: 11.5,
    });
  });

  it("steps a value down by its own step", async () => {
    const { onChange, user } = renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Decrease Margin left/right" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      ...defaultResumeExportSettings,
      marginHorizontal: 46,
    });
  });

  // 1.4 + 0.05 is 1.4500000000000002 in IEEE 754, which would land in the
  // style sheet and in the JSON.stringify preview cache key.
  it("rounds the step away from float drift", async () => {
    const { onChange, user } = renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Increase Line height" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      ...defaultResumeExportSettings,
      lineHeight: 1.45,
    });
  });

  it("clamps rather than stepping past a bound", async () => {
    const { onChange, user } = renderPanel({ fontSize: 15.8 });

    await user.click(screen.getByRole("button", { name: "Increase Font size" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultResumeExportSettings,
      fontSize: 16,
    });
  });

  it("disables the button that would leave the range", () => {
    renderPanel({ fontSize: 16, sectionSpacing: 0 });
    expect(
      screen.getByRole("button", { name: "Increase Font size" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Decrease Font size" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Decrease Section spacing" }),
    ).toBeDisabled();
  });

  it("preserves key order so the preview cache key stays stable", async () => {
    const { onChange, user } = renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Increase Entry spacing" }),
    );

    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(
      Object.keys(defaultResumeExportSettings),
    );
  });
});

describe("ExportSettingsPanel — footer", () => {
  it("shows page numbers by default and turns them off on uncheck", async () => {
    const { onChange, user } = renderPanel();
    const toggle = screen.getByRole("switch", { name: "Show page numbers" });

    expect(toggle).toBeChecked();
    await user.click(toggle);

    expect(onChange).toHaveBeenLastCalledWith({
      ...defaultResumeExportSettings,
      showPageNumbers: false,
    });
  });
});

describe("ExportSettingsPanel — footer, single page", () => {
  it("hides the footer group when the resume is one page", () => {
    render(
      <ExportSettingsPanel
        settings={defaultResumeExportSettings}
        onChange={vi.fn()}
        singlePage
      />,
    );
    expect(screen.queryByRole("button", { name: /Footer/ })).toBeNull();
    expect(
      screen.queryByRole("switch", { name: "Show page numbers" }),
    ).toBeNull();
  });
});

describe("ExportSettingsPanel — typing", () => {
  it("commits a typed value that is in range", async () => {
    const { onChange, user } = renderPanel();
    const input = screen.getByRole("spinbutton", { name: "Section spacing" });

    await user.clear(input);
    await user.type(input, "18");

    expect(onChange).toHaveBeenLastCalledWith({
      ...defaultResumeExportSettings,
      sectionSpacing: 18,
    });
  });

  it("commits a value off the step grid without snapping it", async () => {
    const { onChange, user } = renderPanel();
    const input = screen.getByRole("spinbutton", { name: "Font size" });

    await user.clear(input);
    await user.type(input, "11.3");

    expect(onChange).toHaveBeenLastCalledWith({
      ...defaultResumeExportSettings,
      fontSize: 11.3,
    });
  });

  // Every prefix of "99" is out of range for an 18-90 field, so nothing
  // commits on the way through. "400" would commit 40 as it was typed.
  it("does not commit a value outside the range, and reverts on blur", async () => {
    const { onChange, user } = renderPanel();
    const input = screen.getByRole("spinbutton", { name: "Margin left/right" });

    await user.clear(input);
    await user.type(input, "99");
    expect(onChange).not.toHaveBeenCalled();

    await user.tab();
    expect(input).toHaveValue(48);
  });

  it("does not commit an emptied field", async () => {
    const { onChange, user } = renderPanel();

    await user.clear(screen.getByRole("spinbutton", { name: "Entry spacing" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ExportSettingsPanel — selects", () => {
  it("emits the whole object when the template changes", async () => {
    const { onChange, user } = renderPanel();

    await user.click(screen.getByRole("combobox", { name: "Template" }));
    await user.click(screen.getByRole("option", { name: "Professional" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultResumeExportSettings,
      template: "professional",
    });
  });

  it("emits the whole object when the font changes", async () => {
    const { onChange, user } = renderPanel();

    await user.click(screen.getByRole("combobox", { name: "Font" }));
    await user.click(screen.getByRole("option", { name: "Courier" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultResumeExportSettings,
      font: "courier",
    });
  });
});

describe("ExportSettingsPanel — reset", () => {
  it("renders no reset control when no handler is given", () => {
    renderPanel();
    expect(
      screen.queryByRole("button", { name: "Reset to defaults" }),
    ).not.toBeInTheDocument();
  });

  it("disables reset while the settings are the defaults", () => {
    const onReset = vi.fn();
    render(
      <ExportSettingsPanel
        settings={defaultResumeExportSettings}
        onChange={vi.fn()}
        onReset={onReset}
        isDefault
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reset to defaults" }),
    ).toBeDisabled();
  });

  it("calls the handler once the settings have moved", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <ExportSettingsPanel
        settings={{ ...defaultResumeExportSettings, fontSize: 13 }}
        onChange={vi.fn()}
        onReset={onReset}
        isDefault={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  // The stepper's draft state must follow a value it did not itself change.
  it("shows the reset value in the stepper after the parent re-renders", () => {
    const { rerender } = render(
      <ExportSettingsPanel
        settings={{ ...defaultResumeExportSettings, fontSize: 13 }}
        onChange={vi.fn()}
        onReset={vi.fn()}
        isDefault={false}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "Font size" })).toHaveValue(
      13,
    );

    rerender(
      <ExportSettingsPanel
        settings={defaultResumeExportSettings}
        onChange={vi.fn()}
        onReset={vi.fn()}
        isDefault
      />,
    );

    expect(screen.getByRole("spinbutton", { name: "Font size" })).toHaveValue(
      11,
    );
  });
});
