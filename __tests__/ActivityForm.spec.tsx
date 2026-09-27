import { ActivityForm } from "@/components/activities/ActivityForm";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createActivity,
  getAllActivityTypes,
} from "@/actions/activity.actions";

const activityTypes = [
  { id: "type-1", label: "Development", value: "development" },
  { id: "type-2", label: "Research", value: "research" },
];

vi.mock("@/actions/activity.actions", () => ({
  getAllActivityTypes: vi.fn(),
  createActivity: vi.fn(),
  createActivityType: vi.fn(),
}));

vi.mock("@/actions/company.actions", () => ({ addCompany: vi.fn() }));
vi.mock("@/actions/job.actions", () => ({
  createLocation: vi.fn(),
  createJobSource: vi.fn(),
}));
vi.mock("@/actions/jobtitle.actions", () => ({ createJobTitle: vi.fn() }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

Element.prototype.scrollIntoView = vi.fn();

// Tiptap measures selections through Range, which jsdom leaves unimplemented
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = vi.fn().mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  });
  range.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: vi.fn(),
  });
  return range;
};

const user = userEvent.setup({ skipHover: true, delay: null });

// The form defaults to now/now+5min and the stepper buttons only shift the
// clock, not the date, so a run within minutes of midnight would wrap the
// end time across days and produce a negative duration
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 12, 9, 5, 30));
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderForm() {
  const onClose = vi.fn();
  const reloadActivities = vi.fn();
  vi.mocked(getAllActivityTypes).mockResolvedValue(activityTypes);

  render(<ActivityForm onClose={onClose} reloadActivities={reloadActivities} />);
  await screen.findByText("Activity Name");

  return { onClose, reloadActivities };
}

// The form pre-fills valid times, so only the name and type need filling
async function fillRequiredFields() {
  await user.type(
    screen.getByPlaceholderText("Ex: Job Search, Learning skill, etc"),
    "Applied to roles"
  );
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: "Development" }));
}

async function setEndTimeToStartOfDay() {
  // 12:00 AM is the earliest instant of the day, so it is always at or before
  // the "now" default start — no dependence on when the suite runs
  await user.click(screen.getByRole("button", { name: /^End Time/ }));

  const column = (name: string) => within(screen.getByRole("group", { name }));
  await user.click(column("Hour").getByRole("button", { name: "12" }));
  await user.click(column("Minute").getByRole("button", { name: "00" }));
  await user.click(column("AM/PM").getByRole("button", { name: "AM" }));
  await user.keyboard("{Escape}");
}

describe("ActivityForm", () => {
  it("saves the combined date/time and duration", async () => {
    const { onClose, reloadActivities } = await renderForm();
    vi.mocked(createActivity).mockResolvedValue({
      activity: { id: "activity-1" },
      success: true,
    });

    await fillRequiredFields();
    await user.click(screen.getByTestId("save-activity-btn"));

    await waitFor(() => expect(createActivity).toHaveBeenCalled());
    const payload = vi.mocked(createActivity).mock.calls[0][0];
    expect(payload.activityName).toBe("Applied to roles");
    expect(payload.activityType).toBe("type-1");
    expect(payload.duration).toBe(5);
    expect(payload.endTime!.getTime() - payload.startTime.getTime()).toBe(
      5 * 60 * 1000
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(reloadActivities).toHaveBeenCalled();
  });

  it("keeps the dialog open when the save fails", async () => {
    const { onClose, reloadActivities } = await renderForm();
    vi.mocked(createActivity).mockResolvedValue({
      success: false,
      message: "Failed to create activity. ",
    });

    await fillRequiredFields();
    await user.click(screen.getByTestId("save-activity-btn"));

    await waitFor(() => expect(createActivity).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(reloadActivities).not.toHaveBeenCalled();
  });

  it("recalculates the duration when the end time is stepped", async () => {
    await renderForm();

    // Start Time then End Time, in DOM order
    const later = screen.getAllByRole("button", { name: "5 minutes later" });
    await user.click(later[1]);

    expect(await screen.findByText(/\(10 min\)/)).toBeInTheDocument();
  });

  it("flags an end time before the start time without submitting", async () => {
    await renderForm();

    await setEndTimeToStartOfDay();

    expect(
      await screen.findByText("End time must be after the start time")
    ).toBeInTheDocument();
    expect(createActivity).not.toHaveBeenCalled();
  });
});
