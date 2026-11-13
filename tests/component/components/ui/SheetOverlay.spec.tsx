import { render, screen } from "@testing-library/react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const OVERLAY = "[data-radix-dialog-overlay], .fixed.inset-0";

// Modal on purpose: Radix's DialogOverlay returns null whenever modal is
// false, so a non-modal sheet would pass the suppression case vacuously.
function renderSheet(props: { overlay?: boolean } = {}) {
  return render(
    <Sheet open>
      <SheetContent {...props}>
        <SheetTitle>Panel</SheetTitle>
      </SheetContent>
    </Sheet>,
  );
}

describe("SheetContent overlay prop", () => {
  it("renders the scrim when the prop is omitted — every existing sheet depends on this", () => {
    const { baseElement } = renderSheet();
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(baseElement.querySelector(OVERLAY)).not.toBeNull();
  });

  it("renders the scrim when overlay is explicitly true", () => {
    const { baseElement } = renderSheet({ overlay: true });
    expect(baseElement.querySelector(OVERLAY)).not.toBeNull();
  });

  it("suppresses the scrim when overlay is false", () => {
    const { baseElement } = renderSheet({ overlay: false });
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(baseElement.querySelector(OVERLAY)).toBeNull();
  });

  it("does not leak the prop onto the DOM node", () => {
    const { baseElement } = renderSheet({ overlay: false });
    expect(baseElement.querySelector("[overlay]")).toBeNull();
  });
});
