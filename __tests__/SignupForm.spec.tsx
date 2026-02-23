import { signup, authenticate } from "@/actions/auth.actions";
import SignupForm from "@/components/auth/SignupForm";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";

// Mock the external dependencies
jest.mock("@/actions/auth.actions", () => ({
  signup: jest.fn(),
  authenticate: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("SignupForm Component", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    render(<SignupForm />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the SignupForm component correctly", () => {
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create an account/i }),
    ).toBeInTheDocument();
  });

  it("should display invalid name error when name is too short", async () => {
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Name must be at least 2 characters."),
      ).toBeInTheDocument();
    });
  });

  it("should display invalid email error when email format is incorrect", async () => {
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid-email" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email."),
      ).toBeInTheDocument();
    });
  });

  it("should display email minimum length error", async () => {
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Email must be at least 3 characters."),
      ).toBeInTheDocument();
    });
  });

  it("should display password minimum length error", async () => {
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 6 characters."),
      ).toBeInTheDocument();
    });
  });

  it("should display error message when signup fails", async () => {
    const errorMessage = "An account with this email already exists.";
    (signup as jest.Mock).mockResolvedValueOnce({ error: errorMessage });

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(signup).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("should display error message when authentication fails after signup", async () => {
    const authError = "Something went wrong.";
    (signup as jest.Mock).mockResolvedValueOnce({ success: true });
    (authenticate as jest.Mock).mockResolvedValueOnce(authError);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(screen.getByText(authError)).toBeInTheDocument();
    });
    expect(signup).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });
    expect(authenticate).toHaveBeenCalledWith("", expect.any(FormData));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("submits the form successfully and redirects to dashboard", async () => {
    (signup as jest.Mock).mockResolvedValueOnce({ success: true });
    (authenticate as jest.Mock).mockResolvedValueOnce(null);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

    await waitFor(() => {
      expect(signup).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      });
      expect(authenticate).toHaveBeenCalledWith("", expect.any(FormData));
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
