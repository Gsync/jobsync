import { render, screen, waitFor } from "@testing-library/react";
import StaleSessionSignOut from "@/components/StaleSessionSignOut";

describe("StaleSessionSignOut", () => {
  it("clears the session on mount rather than only redirecting", async () => {
    const signOutAction = vi.fn().mockResolvedValue(undefined);
    render(<StaleSessionSignOut signOutAction={signOutAction} />);

    await waitFor(() => expect(signOutAction).toHaveBeenCalled());
    expect(screen.getByText(/signing you out/i)).toBeInTheDocument();
  });
});
