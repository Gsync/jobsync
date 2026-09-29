import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiUsageSettings from "@/components/settings/AiUsageSettings";
import { getAiUsage } from "@/actions/aiUsage.actions";
import type { AiUsageSummary } from "@/models/aiUsage.model";

vi.mock("@/actions/aiUsage.actions", () => ({ getAiUsage: vi.fn() }));
vi.mock("@nivo/bar", () => ({ ResponsiveBar: () => <div data-testid="daily-chart" /> }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));

const summary = (over: Partial<AiUsageSummary> = {}): AiUsageSummary => ({
  rangeDays: 30,
  totals: {
    inputTokens: 3_020_000,
    outputTokens: 630_000,
    calls: 837,
    previousCalls: 747,
    failures: 13,
    stopped: 5,
    medianMs: 8400,
    p95Ms: 41200,
    medianFirstTokenMs: 1900,
  },
  failuresByStatus: { error: 7, truncated: 3, interrupted: 2, timed_out: 1 },
  days: [{ date: "2026-09-28", tokensByProvider: { ollama: 1000 } }],
  providers: [
    {
      provider: "ollama",
      tokens: 1_840_000,
      calls: 412,
      models: [{ model: "qwen3.5:9b", tokens: 1_840_000, calls: 412, medianMs: 14200, p95Ms: 58000, medianFirstTokenMs: 3100, nearContextLimit: 9 }],
    },
  ],
  features: [{ feature: "agent_chat", tokens: 1_280_000, calls: 318, medianMs: 6100 }],
  recent: [
    {
      id: "c1",
      startedAt: new Date(),
      feature: "resume_review",
      provider: "ollama",
      model: "qwen3.5:9b",
      status: "timed_out",
      inputTokens: 7950,
      outputTokens: null,
      durationMs: 180000,
      firstTokenMs: 3900,
    },
  ],
  ...over,
});

describe("AiUsageSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAiUsage as any).mockResolvedValue({ success: true, data: summary() });
  });

  it("loads 30 days by default with the viewer's timezone", async () => {
    render(<AiUsageSettings />);
    await screen.findByText("3.65M");
    const arg = (getAiUsage as any).mock.calls[0][0];
    expect(arg.rangeDays).toBe(30);
    expect(arg.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(arg.since.getHours()).toBe(0);
  });

  it("renders the stat cards from the design, without a thinking line", async () => {
    render(<AiUsageSettings />);
    expect(await screen.findByText("3.02M input · 0.63M output")).toBeInTheDocument();
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
    expect(screen.getByText("837")).toBeInTheDocument();
    expect(screen.getByText("+12% vs previous 30 days")).toBeInTheDocument();
    expect(screen.getByText("8.4s")).toBeInTheDocument();
    expect(screen.getByText("p95 41.2s")).toBeInTheDocument();
    expect(screen.getByText("7 error · 3 truncated · 2 interrupted · 1 timed out")).toBeInTheDocument();
  });

  it("shows the four failure kinds and the stopped footer", async () => {
    render(<AiUsageSettings />);
    await screen.findByText("Provider error");
    expect(screen.getAllByText("Timed out").length).toBeGreaterThan(0);
    expect(screen.getByText("13 of 837 calls")).toBeInTheDocument();
    expect(screen.getByText("Stopped by you — not counted as failures")).toBeInTheDocument();
  });

  it("flags models near their context limit", async () => {
    render(<AiUsageSettings />);
    expect(await screen.findByText("9 calls near context limit")).toBeInTheDocument();
  });

  it("collapses a provider's models", async () => {
    render(<AiUsageSettings />);
    const toggle = await screen.findByRole("button", { name: /Ollama/ });
    await userEvent.click(toggle);
    expect(screen.queryByText("9 calls near context limit")).not.toBeInTheDocument();
  });

  it("refetches when switching to 7 days", async () => {
    render(<AiUsageSettings />);
    await screen.findByText("3.65M");
    await userEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() => expect((getAiUsage as any).mock.calls.at(-1)[0].rangeDays).toBe(7));
  });

  it("hides the change line when the previous period was empty", async () => {
    (getAiUsage as any).mockResolvedValue({ success: true, data: summary({ totals: { ...summary().totals, previousCalls: 0 } }) });
    render(<AiUsageSettings />);
    await screen.findByText("837");
    expect(screen.queryByText(/vs previous/)).not.toBeInTheDocument();
  });

  it("shows an empty state when the range has no calls", async () => {
    (getAiUsage as any).mockResolvedValue({
      success: true,
      data: summary({ totals: { ...summary().totals, calls: 0 }, providers: [], features: [], recent: [] }),
    });
    render(<AiUsageSettings />);
    expect(await screen.findByText("No AI calls in the last 30 days.")).toBeInTheDocument();
  });

  it("shows an inline error when loading fails", async () => {
    (getAiUsage as any).mockResolvedValue({ success: false, message: "boom" });
    render(<AiUsageSettings />);
    expect(await screen.findByText("Couldn't load AI usage.")).toBeInTheDocument();
  });

  it("shows the inline error, not a spinner, when the action throws", async () => {
    (getAiUsage as any).mockRejectedValue(new Error("fetch failed"));
    render(<AiUsageSettings />);
    expect(await screen.findByText("Couldn't load AI usage.")).toBeInTheDocument();
  });
});
