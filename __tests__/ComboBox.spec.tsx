import { Combobox } from "@/components/ComboBox";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addCompany } from "@/actions/company.actions";
import { createLocation, createJobSource } from "@/actions/job.actions";
import { createJobTitle } from "@/actions/jobtitle.actions";
import { createActivityType } from "@/actions/activity.actions";
import { toastError } from "@/lib/toast";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem } from "@/components/ui/form";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

vi.mock("@/actions/company.actions", () => ({
  addCompany: vi.fn(),
}));

vi.mock("@/actions/job.actions", () => ({
  createLocation: vi.fn(),
  createJobSource: vi.fn(),
}));

vi.mock("@/actions/jobtitle.actions", () => ({
  createJobTitle: vi.fn(),
}));

vi.mock("@/actions/activity.actions", () => ({
  createActivityType: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
}));

// jsdom lacks scrollIntoView, which cmdk calls when selecting an item
Element.prototype.scrollIntoView = vi.fn();

const companies = [
  { id: "existing-id", value: "metallica inc", label: "Metallica Inc" },
  { id: "other-id", value: "acme corp", label: "Acme Corp" },
];

function Harness({
  onChange,
  creatable = true,
  name = "company",
  options = companies,
}: {
  onChange: (v: string) => void;
  creatable?: boolean;
  name?: string;
  options?: { id: string; value: string; label: string }[];
}) {
  const form = useForm({ defaultValues: { [name]: "" } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <Combobox
              options={[...options]}
              field={{
                ...field,
                onChange: (v: string) => {
                  onChange(v);
                  field.onChange(v);
                },
              }}
              creatable={creatable}
            />
          </FormItem>
        )}
      />
    </Form>
  );
}

type HarnessProps = Partial<React.ComponentProps<typeof Harness>>;

async function openCombobox(props: HarnessProps = {}) {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} {...props} />);

  await user.click(screen.getByRole("combobox"));
  const label = props.name ?? "company";
  const input = screen.getByPlaceholderText(
    new RegExp(`Search ${label}`, "i")
  ) as HTMLInputElement;
  return { user, onChange, input };
}

beforeEach(() => {
  vi.mocked(addCompany).mockResolvedValue({
    success: true,
    data: { id: "new-id", label: "acme", value: "acme" },
  } as never);
});

describe("Combobox Enter key", () => {
  describe("creating", () => {
    it("creates a new option when nothing matches the search", async () => {
      const { user, input } = await openCombobox();

      await user.type(input, "Zebra{Enter}");

      await waitFor(() =>
        expect(addCompany).toHaveBeenCalledWith({ company: "Zebra" })
      );
    });

    it("trims surrounding whitespace before creating", async () => {
      const { user, input } = await openCombobox();

      await user.type(input, "  Zebra  {Enter}");

      await waitFor(() =>
        expect(addCompany).toHaveBeenCalledWith({ company: "Zebra" })
      );
    });

    it("selects the created option and closes the popover", async () => {
      const { user, input, onChange } = await openCombobox();

      await user.type(input, "Zebra{Enter}");

      await waitFor(() => expect(onChange).toHaveBeenCalledWith("new-id"));
      await waitFor(() =>
        expect(screen.queryByPlaceholderText(/Search company/i)).toBeNull()
      );
    });

    it("routes to the right action for each field name", async () => {
      vi.mocked(createJobTitle).mockResolvedValue({ id: "t1" } as never);
      const { user, input } = await openCombobox({
        name: "title",
        options: [],
      });

      await user.type(input, "Staff Engineer{Enter}");

      await waitFor(() =>
        expect(createJobTitle).toHaveBeenCalledWith("Staff Engineer")
      );
      expect(addCompany).not.toHaveBeenCalled();
    });

    it("routes activityType to createActivityType", async () => {
      vi.mocked(createActivityType).mockResolvedValue({ id: "a1" } as never);
      const { user, input } = await openCombobox({
        name: "activityType",
        options: [],
      });

      await user.type(input, "Networking{Enter}");

      await waitFor(() =>
        expect(createActivityType).toHaveBeenCalledWith("Networking")
      );
    });
  });

  describe("not creating", () => {
    it("does nothing on Enter with an empty input", async () => {
      const { user, input, onChange } = await openCombobox({ options: [] });

      await user.type(input, "{Enter}");

      await new Promise((r) => setTimeout(r, 50));
      expect(addCompany).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does nothing on Enter with a whitespace-only input", async () => {
      const { user, input, onChange } = await openCombobox({ options: [] });

      await user.type(input, "   {Enter}");

      await new Promise((r) => setTimeout(r, 50));
      expect(addCompany).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does not create when the combobox is not creatable", async () => {
      const { user, input, onChange } = await openCombobox({
        creatable: false,
        options: [],
      });

      await user.type(input, "Zebra{Enter}");

      await new Promise((r) => setTimeout(r, 50));
      expect(addCompany).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does not create on non-Enter keys", async () => {
      const { user, input } = await openCombobox({ options: [] });

      await user.type(input, "Zebra");
      await user.keyboard("{Escape}");

      await new Promise((r) => setTimeout(r, 50));
      expect(addCompany).not.toHaveBeenCalled();
    });

    it("selects an exact match instead of creating a duplicate", async () => {
      const { user, input, onChange } = await openCombobox();

      await user.type(input, "Acme Corp{Enter}");

      await waitFor(() => expect(onChange).toHaveBeenCalledWith("other-id"));
      expect(addCompany).not.toHaveBeenCalled();
    });

    it("matches case-insensitively when selecting an existing option", async () => {
      const { user, input, onChange } = await openCombobox();

      await user.type(input, "ACME CORP{Enter}");

      await waitFor(() => expect(onChange).toHaveBeenCalledWith("other-id"));
      expect(addCompany).not.toHaveBeenCalled();
    });
  });

  // Tailwind's `capitalize` renders a stored "eBay" as "EBay". jsdom applies
  // no stylesheet, so assert on the class chain around the label instead.
  describe("label casing", () => {
    const trademark = [{ id: "ebay-id", value: "ebay", label: "eBay" }];

    function expectNoCapitalize(el: HTMLElement | null) {
      for (let node = el; node; node = node.parentElement) {
        expect(node.className).not.toMatch(/(^|\s|:)capitalize(\s|$)/);
      }
    }

    it("does not capitalize an option label in the list", async () => {
      await openCombobox({ options: trademark });

      expectNoCapitalize(screen.getByText("eBay"));
    });

    it("does not capitalize the create prompt", async () => {
      const { user, input } = await openCombobox({ options: [] });

      await user.type(input, "eBay");

      expectNoCapitalize(screen.getByText("eBay"));
    });

    it("does not capitalize the selected label on the trigger", async () => {
      const { user } = await openCombobox({ options: trademark });

      await user.click(screen.getByText("eBay"));

      await waitFor(() =>
        expect(screen.queryByPlaceholderText(/Search company/i)).toBeNull()
      );
      expectNoCapitalize(screen.getByText("eBay"));
    });
  });

  describe("preserving cmdk defaults", () => {
    it("still selects an arrow-key highlighted option on Enter", async () => {
      const { user, input, onChange } = await openCombobox();

      await user.type(input, "{ArrowDown}");
      await user.keyboard("{Enter}");

      await waitFor(() => expect(onChange).toHaveBeenCalled());
      expect(addCompany).not.toHaveBeenCalled();
      expect(input).toBeDefined();
    });

    it("is not blocked by a highlighted item in an unrelated cmdk list", async () => {
      const user = userEvent.setup();
      render(
        <>
          {/* A second cmdk list mounted elsewhere in the document, e.g. the
              skills TagInput popover mid-close-animation */}
          <Command>
            <CommandList>
              <CommandGroup>
                <CommandItem value="unrelated">Unrelated</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
          <Harness onChange={vi.fn()} />
        </>
      );

      await user.click(screen.getByRole("combobox"));
      await user.type(
        screen.getByPlaceholderText(/Search company/i),
        "Zebra{Enter}"
      );

      await waitFor(() =>
        expect(addCompany).toHaveBeenCalledWith({ company: "Zebra" })
      );
    });
  });

  describe("creation failures", () => {
    it("surfaces an error toast when location creation fails", async () => {
      vi.mocked(createLocation).mockResolvedValue({
        success: false,
        message: "Location already exists",
        data: undefined,
      } as never);
      const { user, input, onChange } = await openCombobox({
        name: "location",
        options: [],
      });

      await user.type(input, "Toronto{Enter}");

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("surfaces an error toast when source creation fails", async () => {
      vi.mocked(createJobSource).mockResolvedValue({
        success: false,
        message: "Source already exists",
        data: undefined,
      } as never);
      const { user, input, onChange } = await openCombobox({
        name: "source",
        options: [],
      });

      await user.type(input, "Referral{Enter}");

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
