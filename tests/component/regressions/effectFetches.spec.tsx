// Pins the mount-time loads whose effects were split into fetch + apply for
// the react-hooks v7 rules (Next 16 upgrade).
import { act, render, renderHook, screen } from "@testing-library/react";
import { AutomationContainer } from "@/components/automations/AutomationContainer";
import QuestionsContainer from "@/components/questions/QuestionsContainer";
import { NotesSection } from "@/components/myjobs/NotesSection";
import { NotesCollapsibleSection } from "@/components/myjobs/NotesCollapsibleSection";
import McpAccessSettings from "@/components/settings/McpAccessSettings";
import { MatchDetails } from "@/components/automations/MatchDetails";
import { useAutomationDetailData } from "@/components/automations/automation-detail-container/useAutomationDetailData";
import { useJobsList } from "@/components/myjobs/jobs-container/useJobsList";
import {
  getAutomationById,
  getAutomationRuns,
  getAutomationsList,
  getDiscoveredJobs,
} from "@/actions/automation.actions";
import { getQuestionsList } from "@/actions/question.actions";
import { getNotesByJobId } from "@/actions/note.actions";
import { listMcpTokens } from "@/actions/mcpToken.actions";
import { getJobsList } from "@/actions/job.actions";
import { EMPTY_JOB_FACETS } from "@/lib/jobs/jobFacets";

const router = { push: vi.fn(), replace: vi.fn() };
const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));
vi.mock("@/actions/automation.actions", () => ({
  getAutomationsList: vi.fn(),
  getAutomationById: vi.fn(),
  getAutomationRuns: vi.fn(),
  getDiscoveredJobs: vi.fn(),
}));
vi.mock("@/actions/question.actions", () => ({
  deleteQuestion: vi.fn(),
  getPrepStageLabel: vi.fn(),
  getQuestionById: vi.fn(),
  getQuestionsList: vi.fn(),
}));
vi.mock("@/actions/note.actions", () => ({
  getNotesByJobId: vi.fn(),
  deleteNote: vi.fn(),
  addNote: vi.fn(),
  updateNote: vi.fn(),
}));
vi.mock("@/actions/mcpToken.actions", () => ({
  listMcpTokens: vi.fn(),
  createMcpToken: vi.fn(),
  revokeMcpToken: vi.fn(),
}));
vi.mock("@/actions/job.actions", () => ({ getJobsList: vi.fn() }));
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => ({ jobWrites: 0 }),
}));
vi.mock("@/components/automations/AutomationList", () => ({
  AutomationList: ({ automations }: { automations: unknown[] }) => (
    <p>{automations.length} automations</p>
  ),
}));
vi.mock("@/components/automations/AutomationWizard", () => ({
  AutomationWizard: () => null,
}));
vi.mock("@/components/questions/QuestionList", () => ({
  QuestionList: ({ questions }: { questions: unknown[] }) => (
    <p>{questions.length} questions</p>
  ),
}));
vi.mock("@/components/questions/QuestionForm", () => ({
  QuestionForm: () => null,
}));
vi.mock("@/components/myjobs/NoteCard", () => ({
  NoteCard: ({ note }: { note: { content: string } }) => <p>{note.content}</p>,
}));
vi.mock("@/components/myjobs/NoteDialog", () => ({ NoteDialog: () => null }));
vi.mock("@/components/TiptapEditor", () => ({ default: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const notes = [
  { id: "n1", content: "first note" },
  { id: "n2", content: "second note" },
];

describe("mount loads", () => {
  it("AutomationContainer shows the spinner, then the list", async () => {
    const reply = deferred<unknown>();
    vi.mocked(getAutomationsList).mockReturnValue(reply.promise as never);
    render(<AutomationContainer resumes={[]} />);
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    await act(async () => reply.resolve({ success: true, data: [{}, {}] }));
    expect(screen.getByText("2 automations")).toBeInTheDocument();
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
  });

  it("QuestionsContainer loads the first page", async () => {
    vi.mocked(getQuestionsList).mockResolvedValue({
      success: true,
      data: [{ id: "q1" }, { id: "q2" }, { id: "q3" }],
      total: 3,
    } as never);
    render(<QuestionsContainer availableTags={[]} />);
    expect(await screen.findByText("3 questions")).toBeInTheDocument();
  });

  it("NotesSection renders the notes and reports the count", async () => {
    vi.mocked(getNotesByJobId).mockResolvedValue({
      success: true,
      data: notes,
    } as never);
    const onCountChange = vi.fn();
    render(<NotesSection jobId="j1" onCountChange={onCountChange} />);
    expect(await screen.findByText("first note")).toBeInTheDocument();
    expect(onCountChange).toHaveBeenCalledWith(2);
  });

  it("NotesCollapsibleSection shows the note count", async () => {
    vi.mocked(getNotesByJobId).mockResolvedValue({
      success: true,
      data: notes,
    } as never);
    render(<NotesCollapsibleSection jobId="j1" />);
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("McpAccessSettings shows loading, then the tokens", async () => {
    const reply = deferred<unknown>();
    vi.mocked(listMcpTokens).mockReturnValue(reply.promise as never);
    render(<McpAccessSettings />);
    expect(screen.getByText(/Loading tokens/)).toBeInTheDocument();
    await act(async () =>
      reply.resolve([
        {
          id: "t1",
          name: "laptop",
          tokenPrefix: "jsp_",
          scopes: [],
          createdAt: new Date(),
          expiresAt: new Date(),
          lastUsedAt: null,
        },
      ]),
    );
    expect(screen.getByText("laptop")).toBeInTheDocument();
  });

  it("MatchDetails renders the markdown body", () => {
    render(<MatchDetails matchData={{ body: "**strong point**" } as never} />);
    expect(screen.getByText("strong point")).toBeInTheDocument();
  });
});

describe("useAutomationDetailData", () => {
  beforeEach(() => {
    vi.mocked(getAutomationById).mockResolvedValue({
      success: true,
      data: { id: "a1", runs: [] },
    } as never);
    vi.mocked(getAutomationRuns).mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    } as never);
    vi.mocked(getDiscoveredJobs).mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    } as never);
  });

  it("shows the full-page spinner only for the initial load", async () => {
    const { result } = renderHook(() => useAutomationDetailData("a1"));
    expect(result.current.loading).toBe(true);
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.automation).toEqual({ id: "a1", runs: [] });

    const seen: boolean[] = [];
    await act(async () => {
      const pending = result.current.loadData();
      seen.push(result.current.loading);
      await pending;
    });
    seen.push(result.current.loading);
    expect(seen).toEqual([false, false]);
  });
});

describe("useJobsList", () => {
  it("is loading on mount until page 1 lands", async () => {
    const reply = deferred<unknown>();
    vi.mocked(getJobsList).mockReturnValue(reply.promise as never);
    const { result } = renderHook(() =>
      useJobsList({
        companyFilter: null,
        appliedFilter: false,
        titleFilter: null,
        locationFilter: null,
        sourceFilter: null,
        facets: EMPTY_JOB_FACETS,
        sort: null,
      }),
    );
    expect(result.current.initialLoading).toBe(true);
    await act(async () =>
      reply.resolve({ success: true, data: [{ id: "j1" }], total: 1 }),
    );
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.jobs).toHaveLength(1);
  });
});
