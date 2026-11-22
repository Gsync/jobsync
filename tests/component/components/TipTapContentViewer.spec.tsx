import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import { joinAnswerHtml } from "@/lib/questions/answer";
import { render, waitFor } from "@testing-library/react";

describe("TipTapContentViewer", () => {
  it("shows a joined answer as two notes split by a rule", async () => {
    const { container } = render(
      <TipTapContentViewer
        content={joinAnswerHtml("<p>Saved note</p>", "<p>New note</p>")}
      />,
    );
    await waitFor(() => expect(container.querySelector("hr")).not.toBeNull());
    const hr = container.querySelector("hr")!;
    expect(hr.previousElementSibling).toHaveTextContent("Saved note");
    expect(hr.nextElementSibling).toHaveTextContent("New note");
  });
});
