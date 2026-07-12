import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { format } from "date-fns";
import { ReviewDetails } from "@/components/profile/ReviewDetails";
import type { ResumeReviewData } from "@/models/ai.schemas";

vi.mock("@/components/TipTapContentViewer", () => ({
  TipTapContentViewer: ({ content }: { content: string }) => (
    <div data-testid="tiptap-content" dangerouslySetInnerHTML={{ __html: content }} />
  ),
}));

const reviewData: ResumeReviewData = {
  overall: 85,
  impact: 80,
  clarity: 82,
  atsCompatibility: 78,
  body: "## Summary\nGreat resume overall",
  reviewedAt: "2026-07-01T10:30:00.000Z",
  provider: "openai",
  model: "gpt-4o",
};

describe("ReviewDetails", () => {
  it("renders nothing when reviewData is null", () => {
    const { container } = render(<ReviewDetails reviewData={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the compact score summary and metadata line", () => {
    render(<ReviewDetails reviewData={reviewData} />);
    expect(screen.getByText("Overall 85")).toBeInTheDocument();
    expect(
      screen.getByText("Impact 80 · Clarity 82 · ATS 78"),
    ).toBeInTheDocument();
    const expected = `Reviewed on ${format(new Date(reviewData.reviewedAt!), "MMM d, yyyy 'at' h:mm a")} using openai / gpt-4o`;
    expect(screen.getByText(/Reviewed on/)).toHaveTextContent(expected);
  });

  it("hides the full markdown body by default", () => {
    render(<ReviewDetails reviewData={reviewData} />);
    expect(screen.queryByTestId("tiptap-content")).not.toBeInTheDocument();
    expect(screen.getByText("Show full review")).toBeInTheDocument();
  });

  it("expands to reveal the full markdown body when the toggle is clicked", () => {
    render(<ReviewDetails reviewData={reviewData} />);
    fireEvent.click(screen.getByText("Show full review"));
    expect(screen.getByTestId("tiptap-content")).toHaveTextContent(
      "Great resume overall",
    );
    expect(screen.getByText("Hide full review")).toBeInTheDocument();
  });
});
