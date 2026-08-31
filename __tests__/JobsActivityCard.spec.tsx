import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobsActivityCard from "@/components/dashboard/JobsActivityCard";

// jsdom measures every element as 0 wide, so the card's compact threshold is
// driven from here instead.
const chartWidth = vi.hoisted(() => ({ value: 400 }));

vi.mock("@/hooks/useElementWidth", () => ({
  useElementWidth: () => [{ current: null }, chartWidth.value] as const,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@nivo/pie", () => ({
  Pie: (props: any) => (
    <div data-testid="donut">
      {props.data.map((slice: any) => (
        <div key={slice.id} data-testid={`slice-${slice.id}`}>
          {slice.label}:{slice.value}:{slice.color}
        </div>
      ))}
    </div>
  ),
}));

describe("JobsActivityCard", () => {
  const user = userEvent.setup();

  // usePersistedTabIndex writes the chosen tab to localStorage, which
  // vitest's clearMocks does not reset — without this a test that clicks
  // "30d" decides the starting tab for every test after it.
  beforeEach(() => {
    localStorage.clear();
    chartWidth.value = 400;
  });

  const data = [
    {
      label: "7d",
      summary: {
        jobsApplied: 16,
        jobsTrend: 25,
        topActivities: [
          { label: "Jobsync", hours: 28.1 },
          { label: "Side Project 1", hours: 9.2 },
          { label: "Learning", hours: 8.6 },
        ],
        otherHours: 17.5,
        totalHours: 63.4,
      },
    },
    {
      label: "30d",
      summary: {
        jobsApplied: 34,
        jobsTrend: -12,
        topActivities: [{ label: "Job Search", hours: 6.4 }],
        otherHours: 0,
        totalHours: 6.4,
      },
    },
  ];

  it("shows the period's total hours and job count in the donut center", () => {
    render(<JobsActivityCard data={data} />);

    const total = screen.getByTestId("jobs-activity-total");

    expect(within(total).getByText("63.4h")).toBeInTheDocument();
    expect(within(total).getByText("16 jobs")).toBeInTheDocument();
  });

  it("labels the slices on the chart instead of in a legend", () => {
    render(<JobsActivityCard data={data} />);

    expect(
      screen.queryByTestId("jobs-activity-legend"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("donut")).toBeInTheDocument();
  });

  it("feeds the same slices to the donut", () => {
    render(<JobsActivityCard data={data} />);

    expect(screen.getByTestId("slice-Jobsync")).toHaveTextContent(
      "Jobsync:28.1:#2a9d90",
    );
    expect(screen.getByTestId("slice-__other__")).toHaveTextContent(
      "Other:17.5:#94a3b8",
    );
  });

  it("switches every number when the period changes", async () => {
    render(<JobsActivityCard data={data} />);

    const toggle = screen.getByTestId("jobs-activity-toggle-group");
    await user.click(within(toggle).getByRole("button", { name: "30d" }));

    const total = screen.getByTestId("jobs-activity-total");

    expect(within(total).getByText("6.4h")).toBeInTheDocument();
    expect(within(total).getByText("34 jobs")).toBeInTheDocument();
    expect(screen.queryByText("Jobsync")).not.toBeInTheDocument();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("shows the jobs trend under the job count", () => {
    render(<JobsActivityCard data={data} />);

    const total = screen.getByTestId("jobs-activity-total");

    expect(within(total).getByText("25%")).toBeInTheDocument();
  });

  it("drops the sign from a falling trend, leaving the arrow to carry it", async () => {
    render(<JobsActivityCard data={data} />);

    const toggle = screen.getByTestId("jobs-activity-toggle-group");
    await user.click(within(toggle).getByRole("button", { name: "30d" }));

    const total = screen.getByTestId("jobs-activity-total");

    expect(within(total).getByText("12%")).toBeInTheDocument();
    expect(within(total).queryByText("-12%")).not.toBeInTheDocument();
  });

  it("hides the trend entirely when it is flat", () => {
    render(<JobsActivityCard data={data.slice(0, 1)} />);

    const total = screen.getByTestId("jobs-activity-total");

    expect(within(total).queryByText("0%")).not.toBeInTheDocument();
  });

  it("holds the donut back until the card has measured itself", () => {
    chartWidth.value = 0;
    render(<JobsActivityCard data={data} />);

    expect(screen.queryByTestId("donut")).not.toBeInTheDocument();
  });

  it("drops the trend line when the donut hole gets too small for it", () => {
    chartWidth.value = 220;
    render(<JobsActivityCard data={data} />);

    const total = screen.getByTestId("jobs-activity-total");

    expect(within(total).getByText("63.4h")).toBeInTheDocument();
    expect(within(total).queryByText("25%")).not.toBeInTheDocument();
  });

  it("says one job, not one jobs", () => {
    render(
      <JobsActivityCard
        data={[
          {
            label: "7d",
            summary: {
              jobsApplied: 1,
              jobsTrend: 0,
              topActivities: [{ label: "Job Search", hours: 2 }],
              otherHours: 0,
              totalHours: 2,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("1 job")).toBeInTheDocument();
  });

  it("keeps the job count visible when no activity is logged", () => {
    render(
      <JobsActivityCard
        data={[
          {
            label: "7d",
            summary: {
              jobsApplied: 3,
              jobsTrend: 0,
              topActivities: [],
              otherHours: 0,
              totalHours: 0,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("0h")).toBeInTheDocument();
    expect(screen.getByText("3 jobs")).toBeInTheDocument();
    expect(screen.getByText("No activities recorded")).toBeInTheDocument();
    expect(screen.queryByTestId("donut")).not.toBeInTheDocument();
  });
});
