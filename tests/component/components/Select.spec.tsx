import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectFormCtrl from "@/components/Select";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";

const options = [
  { id: "a", title: "Complete CV" },
  { id: "b", title: "Draft CV", disabled: true, suffix: <i>Incomplete</i> },
];

function Harness({ value }: { value?: string }) {
  const form = useForm({ defaultValues: { resume: value } });
  return (
    <Form {...form}>
      <SelectFormCtrl
        label="Resume"
        options={options}
        field={{ ...form.register("resume"), value } as any}
      />
    </Form>
  );
}

describe("SelectFormCtrl disabled options", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("shows a disabled option's title and suffix when it is the current value", () => {
    render(<Harness value="b" />);

    expect(screen.getByText("Draft CV")).toBeInTheDocument();
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });

  it("marks a disabled option as disabled in the list", async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: /Draft CV/ })).toHaveAttribute(
      "data-disabled",
    );
    expect(
      screen.getByRole("option", { name: /Complete CV/ }),
    ).not.toHaveAttribute("data-disabled");
  });

  it("makes the hint a plain icon inside the closed trigger", () => {
    render(<Harness />);

    expect(screen.getByRole("combobox").className).toContain(
      "[&_[data-incomplete-hint]]:pointer-events-none",
    );
  });
});
