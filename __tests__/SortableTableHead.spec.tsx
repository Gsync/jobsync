import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortableTableHead } from "@/components/SortableTableHead";

function renderHead(sort: { field: string; dir: "asc" | "desc" } | null) {
  const onSort = vi.fn();
  render(
    <table>
      <thead>
        <tr>
          <SortableTableHead field="company" sort={sort} onSort={onSort}>
            Company
          </SortableTableHead>
        </tr>
      </thead>
    </table>,
  );
  return { onSort, th: screen.getByRole("columnheader") };
}

describe("SortableTableHead", () => {
  it("calls onSort with its field when clicked", async () => {
    const { onSort } = renderHead(null);
    await userEvent.click(screen.getByRole("button", { name: "Company" }));
    expect(onSort).toHaveBeenCalledWith("company");
  });

  it("has no aria-sort when another column is sorted", () => {
    const { th } = renderHead({ field: "title", dir: "asc" });
    expect(th).not.toHaveAttribute("aria-sort");
  });

  it("reports ascending and descending on the active column", () => {
    const { th } = renderHead({ field: "company", dir: "asc" });
    expect(th).toHaveAttribute("aria-sort", "ascending");
  });

  it("reports descending", () => {
    const { th } = renderHead({ field: "company", dir: "desc" });
    expect(th).toHaveAttribute("aria-sort", "descending");
  });
});
