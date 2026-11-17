import { TimePicker } from "@/components/TimePicker";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem } from "@/components/ui/form";

// jsdom lacks scrollIntoView; the columns also read layout boxes on open
Element.prototype.scrollIntoView = vi.fn();

const user = userEvent.setup({ skipHover: true });

// TimePicker renders a FormControl, so it only works inside a form context —
// the same way it is used in ActivityForm.
function Harness({
  initialValue = "09:05 AM",
  onChange = vi.fn(),
}: {
  initialValue?: string;
  onChange?: (value: string) => void;
}) {
  const form = useForm({
    defaultValues: { startTime: initialValue },
    mode: "onTouched",
  });
  const isTouched = !!form.formState.touchedFields.startTime;

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem>
            <TimePicker
              field={{
                ...field,
                onChange: (value: string) => {
                  field.onChange(value);
                  onChange(value);
                },
              }}
            />
            <span data-testid="touched">{String(isTouched)}</span>
          </FormItem>
        )}
      />
    </Form>
  );
}

const column = (name: string) => within(screen.getByRole("group", { name }));

async function openPicker(initialValue?: string) {
  const onChange = vi.fn();
  render(<Harness initialValue={initialValue} onChange={onChange} />);
  await user.click(
    screen.getByRole("button", { name: initialValue === "" ? "Pick a time" : "09:05 AM" })
  );
  return { onChange };
}

describe("TimePicker", () => {
  it("shows the current value on the trigger", () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", { name: "09:05 AM" })
    ).toBeInTheDocument();
  });

  it("prompts when there is no value yet", () => {
    render(<Harness initialValue="" />);

    expect(
      screen.getByRole("button", { name: "Pick a time" })
    ).toBeInTheDocument();
  });

  it("marks the current parts as pressed when opened", async () => {
    await openPicker();

    expect(column("Hour").getByRole("button", { name: "09" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(column("Minute").getByRole("button", { name: "05" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(column("AM/PM").getByRole("button", { name: "AM" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("keeps the minute and meridiem when the hour changes", async () => {
    const { onChange } = await openPicker();

    await user.click(column("Hour").getByRole("button", { name: "11" }));

    expect(onChange).toHaveBeenCalledWith("11:05 AM");
  });

  it("keeps the hour and meridiem when the minute changes", async () => {
    const { onChange } = await openPicker();

    await user.click(column("Minute").getByRole("button", { name: "42" }));

    expect(onChange).toHaveBeenCalledWith("09:42 AM");
  });

  it("keeps the hour and minute when the meridiem changes", async () => {
    const { onChange } = await openPicker();

    await user.click(column("AM/PM").getByRole("button", { name: "PM" }));

    expect(onChange).toHaveBeenCalledWith("09:05 PM");
  });

  it("emits a padded value the schema regex accepts", async () => {
    const { onChange } = await openPicker("");

    await user.click(column("Hour").getByRole("button", { name: "03" }));

    // Unset parts fall back to 12:00 AM rather than emitting a partial string
    expect(onChange).toHaveBeenCalledWith("03:00 AM");
    expect(onChange.mock.calls[0][0]).toMatch(
      /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/
    );
  });

  it("reflects the new value on the trigger", async () => {
    await openPicker();

    await user.click(column("AM/PM").getByRole("button", { name: "PM" }));
    // The popover is modal, so the trigger stays aria-hidden until it closes
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: "09:05 PM" })
    ).toBeInTheDocument();
  });

  it("steps the time forward and back by five minutes", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "5 minutes later" }));
    expect(onChange).toHaveBeenLastCalledWith("09:10 AM");

    await user.click(screen.getByRole("button", { name: "5 minutes earlier" }));
    expect(onChange).toHaveBeenLastCalledWith("09:05 AM");
  });

  it("wraps the clock when a step crosses midnight", async () => {
    const onChange = vi.fn();
    render(<Harness initialValue="11:58 PM" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "5 minutes later" }));

    expect(onChange).toHaveBeenLastCalledWith("12:03 AM");
  });

  it("wraps backwards across midnight too", async () => {
    const onChange = vi.fn();
    render(<Harness initialValue="12:02 AM" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "5 minutes earlier" }));

    expect(onChange).toHaveBeenLastCalledWith("11:57 PM");
  });

  it("steps from midnight when there is no value yet", async () => {
    const onChange = vi.fn();
    render(<Harness initialValue="" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "5 minutes later" }));

    expect(onChange).toHaveBeenLastCalledWith("12:05 AM");
  });

  // The onTouched validation mode never arms unless the trigger forwards blur
  it("marks the field touched once the trigger loses focus", async () => {
    render(<Harness />);
    expect(screen.getByTestId("touched")).toHaveTextContent("false");

    await user.click(screen.getByRole("button", { name: "09:05 AM" }));

    expect(screen.getByTestId("touched")).toHaveTextContent("true");
  });
});
