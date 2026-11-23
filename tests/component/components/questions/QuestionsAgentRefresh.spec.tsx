import { render, waitFor } from "@testing-library/react";
import QuestionsContainer from "@/components/questions/QuestionsContainer";
import { getQuestionsList } from "@/actions/question.actions";
import { APP_CONSTANTS } from "@/lib/constants";

let questionWrites = 0;
const searchParams = new URLSearchParams("stage=s-1");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => ({ questionWrites }),
}));
vi.mock("@/actions/question.actions", () => ({
  deleteQuestion: vi.fn(),
  getPrepStageLabel: vi.fn(async () => ({ success: false })),
  getQuestionById: vi.fn(),
  getQuestionsList: vi.fn(async () => ({ success: true, data: [], total: 0 })),
}));
vi.mock("@/components/questions/QuestionList", () => ({ QuestionList: () => null }));
vi.mock("@/components/questions/QuestionForm", () => ({ QuestionForm: () => null }));

// The agent saves server-side, so the counter is the page's only signal
it("reloads page 1 under the current filter and stage after a chat write", async () => {
  const onQuestionsChanged = vi.fn();
  const tree = () => (
    <QuestionsContainer availableTags={[]} filterKey="tag-1" onQuestionsChanged={onQuestionsChanged} />
  );
  const { rerender } = render(tree());
  await waitFor(() => expect(getQuestionsList).toHaveBeenCalledTimes(1));
  expect(onQuestionsChanged).not.toHaveBeenCalled();

  questionWrites = 1;
  rerender(tree());

  await waitFor(() => expect(onQuestionsChanged).toHaveBeenCalledTimes(1));
  expect(getQuestionsList).toHaveBeenCalledTimes(2);
  expect(getQuestionsList).toHaveBeenLastCalledWith(
    1, APP_CONSTANTS.RECORDS_PER_PAGE, "tag-1", undefined, "s-1",
  );
});
