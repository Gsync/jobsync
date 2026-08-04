import { render, screen } from "@testing-library/react";
import { AgentReviewScoreCard } from "@/components/agent/AgentReviewScoreCard";

describe("AgentReviewScoreCard", () => {
  it("renders the three sub-scores", () => {
    render(
      <AgentReviewScoreCard
        scores={{ overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 }}
      />,
    );
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("81")).toBeInTheDocument();
    expect(screen.getByText("69")).toBeInTheDocument();
  });
});
