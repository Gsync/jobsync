import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import AuthCard from "@/components/auth/AuthCard";
import { useRouter } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock SigninForm and SignupForm — they have their own tests and depend on
// react-hook-form + zod + server actions which are outside the scope of
// AuthCard's locale-rendering responsibility.
jest.mock("@/components/auth/SigninForm", () => {
  const SigninForm = () => <div data-testid="signin-form" />;
  SigninForm.displayName = "SigninForm";
  return SigninForm;
});

jest.mock("@/components/auth/SignupForm", () => {
  const SignupForm = () => <div data-testid="signup-form" />;
  SignupForm.displayName = "SignupForm";
  return SignupForm;
});

describe("AuthCard", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    // Reset lang so tests are not order-dependent
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.documentElement.lang = "";
  });

  // --- locale="de" ---

  describe('when locale="de"', () => {
    it('shows German "Anmelden" tab in signin mode', () => {
      render(<AuthCard mode="signin" locale="de" />);
      expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
    });

    it('shows German "Konto erstellen" tab in signin mode', () => {
      render(<AuthCard mode="signin" locale="de" />);
      expect(screen.getByRole("button", { name: "Konto erstellen" })).toBeInTheDocument();
    });

    it('shows German "Anmelden" tab in signup mode', () => {
      render(<AuthCard mode="signup" locale="de" />);
      expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
    });

    it('shows German "Konto erstellen" tab in signup mode', () => {
      render(<AuthCard mode="signup" locale="de" />);
      expect(screen.getByRole("button", { name: "Konto erstellen" })).toBeInTheDocument();
    });

    it("renders German heading text for signin mode", () => {
      render(<AuthCard mode="signin" locale="de" />);
      expect(screen.getByText("Willkommen zurück")).toBeInTheDocument();
    });

    it("renders German heading text for signup mode", () => {
      render(<AuthCard mode="signup" locale="de" />);
      expect(screen.getByText("Los geht's")).toBeInTheDocument();
    });
  });

  // --- locale="en" ---

  describe('when locale="en"', () => {
    it('shows English "Sign In" tab in signin mode', () => {
      render(<AuthCard mode="signin" locale="en" />);
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });

    it('shows English "Create Account" tab in signin mode', () => {
      render(<AuthCard mode="signin" locale="en" />);
      expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    });

    it('shows English "Sign In" tab in signup mode', () => {
      render(<AuthCard mode="signup" locale="en" />);
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });

    it('shows English "Create Account" tab in signup mode', () => {
      render(<AuthCard mode="signup" locale="en" />);
      expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    });

    it("renders English heading text for signin mode", () => {
      render(<AuthCard mode="signin" locale="en" />);
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });

    it("renders English heading text for signup mode", () => {
      render(<AuthCard mode="signup" locale="en" />);
      expect(screen.getByText("Get started")).toBeInTheDocument();
    });
  });

  // --- no locale prop (default "en" behaviour via document.documentElement.lang) ---

  describe("when no locale prop is provided", () => {
    it("falls back to document.documentElement.lang and shows English tabs when lang=en", () => {
      document.documentElement.lang = "en";
      render(<AuthCard mode="signin" />);
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    });

    it("falls back to document.documentElement.lang and shows German tabs when lang=de", () => {
      document.documentElement.lang = "de";
      render(<AuthCard mode="signin" />);
      expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Konto erstellen" })).toBeInTheDocument();
    });

    it('defaults to English when document.documentElement.lang is empty', () => {
      document.documentElement.lang = "";
      render(<AuthCard mode="signin" />);
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    });
  });

  // --- mode-specific form rendering ---

  describe("mode-specific form rendering", () => {
    it("renders SigninForm in signin mode", () => {
      render(<AuthCard mode="signin" locale="en" />);
      expect(screen.getByTestId("signin-form")).toBeInTheDocument();
      expect(screen.queryByTestId("signup-form")).not.toBeInTheDocument();
    });

    it("renders SignupForm in signup mode", () => {
      render(<AuthCard mode="signup" locale="en" />);
      expect(screen.getByTestId("signup-form")).toBeInTheDocument();
      expect(screen.queryByTestId("signin-form")).not.toBeInTheDocument();
    });
  });

  // --- tab navigation calls router ---

  describe("tab button navigation", () => {
    it("calls router.push('/signin') when Sign In tab is clicked", () => {
      render(<AuthCard mode="signup" locale="en" />);
      screen.getByRole("button", { name: "Sign In" }).click();
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });

    it("calls router.push('/signup') when Create Account tab is clicked", () => {
      render(<AuthCard mode="signin" locale="en" />);
      screen.getByRole("button", { name: "Create Account" }).click();
      expect(mockPush).toHaveBeenCalledWith("/signup");
    });
  });
});
