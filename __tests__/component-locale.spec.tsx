/**
 * Component locale parameterization tests.
 *
 * Verifies that QuestionCard and DeveloperSettings render correctly
 * across all 4 supported locales (en, de, fr, es).
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { getDictionary } from "@/i18n/dictionaries";
import type { Question } from "@/models/question.model";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useTranslations to use real dictionaries keyed by locale
let mockLocale = "en";

jest.mock("@/i18n", () => ({
  useTranslations: jest.fn(() => {
    const dict = require("@/i18n/dictionaries").getDictionary(mockLocale);
    return {
      t: (key: string) => dict[key] ?? key,
      locale: mockLocale,
    };
  }),
}));

// Mock DOMPurify (used by QuestionCard to sanitize answer HTML)
jest.mock("dompurify", () => ({
  sanitize: (html: string) => html,
}));

// Mock lucide-react icons to simple spans
jest.mock("lucide-react", () => ({
  MoreHorizontal: (props: any) => <span data-testid="icon-more" {...props} />,
  Pencil: (props: any) => <span data-testid="icon-pencil" {...props} />,
  Trash2: (props: any) => <span data-testid="icon-trash" {...props} />,
  Loader2: (props: any) => <span data-testid="icon-loader" {...props} />,
  Check: (props: any) => <span data-testid="icon-check" {...props} />,
}));

// Mock Radix DropdownMenu to render children directly in the DOM
// (Radix uses portals and Popper which do not work in JSDOM)
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler;
    className?: string;
  }) => (
    <button data-testid="dropdown-item" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock Radix AlertDialog to render children directly in the DOM
jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <div data-testid="alert-dialog" data-open={open}>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-desc">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-cancel">{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler;
    className?: string;
  }) => (
    <button data-testid="alert-action" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock Button component (used by DeveloperSettings for the confirm button)
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
    <button {...props}>{children}</button>
  ),
}));

// Mock actions used by DeveloperSettings
jest.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: jest.fn().mockResolvedValue({ success: true, data: {} }),
  updateUserSettings: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock toast
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

// Import components after mocks are set up
import { QuestionCard } from "@/components/questions/QuestionCard";
import DeveloperSettings from "@/components/settings/DeveloperSettings";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const LOCALES = ["en", "de", "fr", "es"] as const;

const mockQuestion: Question = {
  id: "q-1",
  question: "What is your greatest strength?",
  answer: "<p>I am very detail-oriented.</p>",
  createdBy: "user-1",
  tags: [
    { id: "t-1", label: "Soft Skills", value: "soft-skills", createdBy: "user-1" },
    { id: "t-2", label: "Interview", value: "interview", createdBy: "user-1" },
  ],
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-01-15"),
};

const mockQuestionLong: Question = {
  id: "q-2",
  question: "Tell me about yourself.",
  answer: "<p>" + "A".repeat(350) + "</p>",
  createdBy: "user-1",
  tags: [],
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-01-15"),
};

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

// ---------------------------------------------------------------------------
// QuestionCard locale tests
// ---------------------------------------------------------------------------

describe.each(LOCALES)("QuestionCard renders in %s", (locale) => {
  let dict: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = locale;
    dict = getDictionary(locale);
  });

  it("renders the question text unchanged (not translated)", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("What is your greatest strength?")).toBeInTheDocument();
  });

  it("renders tag labels (non-translatable user data)", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("Soft Skills")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
  });

  it("renders the answer HTML content", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText("I am very detail-oriented.")).toBeInTheDocument();
  });

  it("renders edit menu item with translated text", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const editText = dict["questions.edit"];
    expect(editText).toBeTruthy();
    expect(screen.getAllByText(editText).length).toBeGreaterThanOrEqual(1);
  });

  it("renders delete menu item with translated text", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const deleteText = dict["questions.delete"];
    expect(deleteText).toBeTruthy();
    // Delete text appears in the dropdown item AND in the alert dialog action button
    const deleteElements = screen.getAllByText(deleteText);
    expect(deleteElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders translated delete dialog title", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const deleteTitle = dict["questions.deleteTitle"];
    expect(deleteTitle).toBeTruthy();
    expect(screen.getByTestId("alert-title")).toHaveTextContent(deleteTitle);
  });

  it("renders translated delete dialog description", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const deleteDesc = dict["questions.deleteDesc"];
    expect(deleteDesc).toBeTruthy();
    expect(screen.getByTestId("alert-desc")).toHaveTextContent(deleteDesc);
  });

  it("renders translated cancel button in delete dialog", () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const cancelText = dict["questions.cancel"];
    expect(cancelText).toBeTruthy();
    expect(screen.getByTestId("alert-cancel")).toHaveTextContent(cancelText);
  });

  it("renders the show more button with translated text for long answers", () => {
    render(
      <QuestionCard
        question={mockQuestionLong}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const showMoreText = dict["questions.showMore"];
    expect(showMoreText).toBeTruthy();
    expect(screen.getByText(showMoreText)).toBeInTheDocument();
  });

  it("toggles show more / show less with translated text", () => {
    render(
      <QuestionCard
        question={mockQuestionLong}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );
    const showMoreText = dict["questions.showMore"];
    const showLessText = dict["questions.showLess"];

    const toggleButton = screen.getByText(showMoreText);
    fireEvent.click(toggleButton);

    expect(screen.getByText(showLessText)).toBeInTheDocument();
  });

  if (locale !== "en") {
    it("does not contain hardcoded English UI labels", () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const enDict = getDictionary("en");
      const localDict = getDictionary(locale);

      // Check key UI labels that differ between locales
      const keysToCheck = [
        "questions.edit",
        "questions.delete",
        "questions.deleteTitle",
        "questions.deleteDesc",
        "questions.cancel",
      ];

      for (const key of keysToCheck) {
        const enValue = enDict[key];
        const localValue = localDict[key];
        // Only check when the translations actually differ
        if (enValue !== localValue) {
          // The English version should NOT be present
          expect(screen.queryAllByText(enValue)).toHaveLength(0);
        }
      }
    });

    it("show more/less buttons use translated text, not English", () => {
      render(
        <QuestionCard
          question={mockQuestionLong}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );
      const enDict = getDictionary("en");
      const localDict = getDictionary(locale);

      const showMoreEn = enDict["questions.showMore"];
      const showMoreLocal = localDict["questions.showMore"];

      if (showMoreEn !== showMoreLocal) {
        expect(screen.queryByText(showMoreEn)).not.toBeInTheDocument();
        expect(screen.getByText(showMoreLocal)).toBeInTheDocument();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// DeveloperSettings locale tests
// ---------------------------------------------------------------------------

describe.each(LOCALES)("DeveloperSettings renders in %s", (locale) => {
  let dict: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = locale;
    dict = getDictionary(locale);
  });

  it("renders the section heading with translated text", () => {
    render(<DeveloperSettings />);
    const heading = dict["settings.developerSettings"];
    expect(heading).toBeTruthy();
    const elements = screen.getAllByText(heading);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the section description with translated text", () => {
    render(<DeveloperSettings />);
    const desc = dict["settings.developerSettingsDesc"];
    expect(desc).toBeTruthy();
    const elements = screen.getAllByText(desc);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders loading state with translated text", () => {
    render(<DeveloperSettings />);
    const loadingText = dict["settings.loadingSettings"];
    expect(loadingText).toBeTruthy();
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  it("renders toggle labels with translated text after loading", async () => {
    await act(async () => {
      render(<DeveloperSettings />);
    });
    // Wait for the useEffect to resolve and component to re-render
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const debugLogging = dict["settings.debugLogging"];
    expect(debugLogging).toBeTruthy();
    const elements = screen.getAllByText(debugLogging);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders scheduler/runner/automation logger labels after loading", async () => {
    await act(async () => {
      render(<DeveloperSettings />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const schedulerLabel = dict["settings.schedulerLogs"];
    const runnerLabel = dict["settings.runnerLogs"];
    const automationLabel = dict["settings.automationLoggerLogs"];

    expect(schedulerLabel).toBeTruthy();
    expect(runnerLabel).toBeTruthy();
    expect(automationLabel).toBeTruthy();

    expect(screen.getByText(schedulerLabel)).toBeInTheDocument();
    expect(screen.getByText(runnerLabel)).toBeInTheDocument();
    expect(screen.getByText(automationLabel)).toBeInTheDocument();
  });

  if (locale !== "en") {
    it("does not leak hardcoded English strings for key labels", () => {
      render(<DeveloperSettings />);
      const enDict = getDictionary("en");
      const localDict = getDictionary(locale);

      const keysToCheck = [
        "settings.developerSettings",
        "settings.developerSettingsDesc",
        "settings.loadingSettings",
      ];

      for (const key of keysToCheck) {
        const enValue = enDict[key];
        const localValue = localDict[key];
        if (enValue !== localValue) {
          // English value should NOT appear
          const enElements = screen.queryAllByText(enValue);
          expect(enElements).toHaveLength(0);
          // Translated value SHOULD appear
          const localElements = screen.queryAllByText(localValue);
          expect(localElements.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("does not leak English toggle labels after loading", async () => {
      await act(async () => {
        render(<DeveloperSettings />);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const enDict = getDictionary("en");
      const localDict = getDictionary(locale);

      const keysToCheck = [
        "settings.debugLogging",
        "settings.schedulerLogs",
        "settings.runnerLogs",
        "settings.automationLoggerLogs",
      ];

      for (const key of keysToCheck) {
        const enValue = enDict[key];
        const localValue = localDict[key];
        if (enValue !== localValue) {
          expect(screen.queryAllByText(enValue)).toHaveLength(0);
          expect(screen.queryAllByText(localValue).length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  }
});
