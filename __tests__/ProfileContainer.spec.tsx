import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileContainer from "@/components/profile/ProfileContainer";
import React from "react";

jest.mock("@/actions/profile.actions", () => ({
  getResumeList: jest.fn(() =>
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
    jest.clearAllMocks();
    await act(async () => {
      render(<ProfileContainer />);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it("should render the profile container component", () => {
    expect(screen.getByText(/profile/i)).toBeInTheDocument();
  });

  it("should open the create resume dialog upon clicking create resume button", async () => {
    const createResumeButton = screen.getByRole("button", {
      name: /new resume/i,
    });
    await act(async () => {
      fireEvent.click(createResumeButton);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create resume/i }),
    ).toBeInTheDocument();
  });
});
