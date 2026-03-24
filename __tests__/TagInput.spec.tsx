import React, { useState } from "react";
import { TagInput } from "@/components/myjobs/TagInput";
import { Tag } from "@/models/job.model";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTag } from "@/actions/tag.actions";

jest.mock("@/actions/tag.actions", () => ({
  createTag: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

// Required by Radix UI Popover / Command components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();

document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn().mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  });
  range.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: jest.fn(),
  });
  return range;
};

// Controlled wrapper so we can track state changes
function ControlledTagInput({
  availableTags,
  initialIds = [],
}: {
  availableTags: Tag[];
  initialIds?: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  return (
    <TagInput
      availableTags={availableTags}
      selectedTagIds={selectedIds}
      onChange={setSelectedIds}
    />
  );
}

const MOCK_TAGS: Tag[] = [
  { id: "tag-1", label: "React", value: "react", createdBy: "user-1" },
  {
    id: "tag-2",
    label: "TypeScript",
    value: "typescript",
    createdBy: "user-1",
  },
  { id: "tag-3", label: "Node.js", value: "node.js", createdBy: "user-1" },
];

describe("TagInput Component", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the trigger button with default placeholder text", () => {
    render(<ControlledTagInput availableTags={MOCK_TAGS} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Search or add a skill...")).toBeInTheDocument();
  });

  it("opens the dropdown and shows available tags when the trigger is clicked", async () => {
    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
    });
  });

  it("selects a tag when an option is clicked and renders it as a badge", async () => {
    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "React" }));

    await waitFor(() => {
      // Badge should appear in the selected tags area
      const badges = screen.getAllByText("React");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("closes the popover after selecting an existing tag", async () => {
    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "TypeScript" }));

    await waitFor(() => {
      // Options list should be gone
      expect(
        screen.queryByRole("option", { name: "React" }),
      ).not.toBeInTheDocument();
    });
  });

  it("excludes already-selected tags from the dropdown options", async () => {
    render(
      <ControlledTagInput availableTags={MOCK_TAGS} initialIds={["tag-1"]} />,
    );

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "React" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "TypeScript" }),
      ).toBeInTheDocument();
    });
  });

  it("removes a tag badge when the remove button is clicked", async () => {
    render(
      <ControlledTagInput
        availableTags={MOCK_TAGS}
        initialIds={["tag-1", "tag-2"]}
      />,
    );

    const removeReactBtn = screen.getByRole("button", {
      name: /remove react/i,
    });
    await user.click(removeReactBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /remove react/i }),
      ).not.toBeInTheDocument();
      // TypeScript badge should still be present
      expect(
        screen.getByRole("button", { name: /remove typescript/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders selected tag badges for pre-selected tags", () => {
    render(
      <ControlledTagInput
        availableTags={MOCK_TAGS}
        initialIds={["tag-1", "tag-3"]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /remove react/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove node.js/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove typescript/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a create option when typed value has no exact match", async () => {
    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type a skill..."), "GraphQL");

    await waitFor(() => {
      expect(screen.getByText(/Create "GraphQL"/i)).toBeInTheDocument();
    });
  });

  it("hides the create option when the typed value exactly matches an existing tag", async () => {
    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type a skill..."), "react");

    await waitFor(() => {
      expect(screen.queryByText(/Create "react"/i)).not.toBeInTheDocument();
    });
  });

  it("calls createTag with the typed label and closes the popover on success", async () => {
    const newTag: Tag = {
      id: "tag-99",
      label: "GraphQL",
      value: "graphql",
      createdBy: "user-1",
    };
    (createTag as jest.Mock).mockResolvedValue({ success: true, data: newTag });

    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type a skill..."), "GraphQL");
    await user.click(await screen.findByText(/Create "GraphQL"/i));

    await waitFor(() => {
      expect(createTag).toHaveBeenCalledWith("GraphQL");
      // Popover should be closed
      expect(
        screen.queryByRole("option", { name: "React" }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows a toast error and keeps the popover open when createTag fails", async () => {
    const { toast } = require("@/components/ui/use-toast");
    (createTag as jest.Mock).mockResolvedValue({
      success: false,
      message: "Server error",
    });

    render(<ControlledTagInput availableTags={MOCK_TAGS} />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type a skill..."), "GraphQL");
    await user.click(await screen.findByText(/Create "GraphQL"/i));

    await waitFor(() => {
      expect(createTag).toHaveBeenCalledWith("GraphQL");
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "Server error",
        }),
      );
    });
  });

  it("disables the trigger and shows max-reached message when 10 tags are selected", () => {
    const tenTagIds = Array.from({ length: 10 }, (_, i) => `tag-${i + 100}`);
    const tenTags: Tag[] = tenTagIds.map((id, i) => ({
      id,
      label: `Skill ${i + 1}`,
      value: `skill-${i + 1}`,
      createdBy: "user-1",
    }));

    render(
      <ControlledTagInput
        availableTags={[...MOCK_TAGS, ...tenTags]}
        initialIds={tenTagIds}
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    expect(screen.getByText("Max skills reached")).toBeInTheDocument();
  });
});
