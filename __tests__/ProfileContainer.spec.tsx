import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileContainer from "@/components/profile/ProfileContainer";
import React from "react";

vi.mock("@/actions/profile.actions", () => ({
  getResumeList: vi.fn(() =>
    Promise.resolve({
      data: [],
      total: 0,
      success: true,
      message: "",
    }),
  ),
}));

vi.mock("@/actions/coverLetter.actions", () => ({
  getCoverLetterList: vi.fn(() =>
    Promise.resolve({
      data: [],
      total: 0,
      success: true,
      message: "",
    }),
  ),
}));

describe("ProfileContainer Component", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      render(<ProfileContainer />);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  it("should render the profile container component", () => {
    expect(screen.getByText(/profile/i)).toBeInTheDocument();
  });

  it("should open the create resume dialog upon clicking create resume button", async () => {
    const user = userEvent.setup();

    const newButton = screen.getByRole("button", {
      name: /new/i,
    });
    await user.click(newButton);

    const addResumeItem = await screen.findByText(/add new resume/i);
    await user.click(addResumeItem);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create resume/i }),
    ).toBeInTheDocument();
  });
});
