import { act, fireEvent, render, screen } from "@testing-library/react";
import { authenticate, signup } from "@/actions/auth.actions";
import SigninForm from "@/components/auth/SigninForm";
import SignupForm from "@/components/auth/SignupForm";

vi.mock("@/actions/auth.actions", () => ({
  authenticate: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

it.each(["signin", "signup"])(
  "keeps the %s submit label while pending and announces errors",
  async (mode) => {
    let finish!: (value: "Invalid credentials.") => void;
    vi.mocked(authenticate).mockImplementationOnce(
      () =>
        new Promise<"Invalid credentials.">((resolve) => {
          finish = resolve;
        }),
    );
    vi.mocked(signup).mockResolvedValueOnce({ success: true });
    render(mode === "signin" ? <SigninForm /> : <SignupForm />);
    if (mode === "signup")
      fireEvent.change(screen.getByLabelText("Full Name"), {
        target: { value: "Local Tester" },
      });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    const button = screen.getByRole("button", {
      name: mode === "signin" ? "Login" : "Create an account",
    });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await act(async () => {
      finish("Invalid credentials.");
    });
    expect(button).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials.");
  },
);
