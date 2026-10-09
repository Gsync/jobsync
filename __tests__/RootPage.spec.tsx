import { render, screen } from "@testing-library/react";
import db from "@/lib/db";
import { redirect } from "next/navigation";
import RootPage from "@/app/page";

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ default: { user: { count: vi.fn() } } }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

describe("public root", () => {
  it("redirects authenticated visitors without querying public account state", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await expect(RootPage()).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
    expect(db.user.count).not.toHaveBeenCalled();
  });

  it.each([0, 1])(
    "renders the landing page with %i existing accounts",
    async (count) => {
      mockAuth.mockResolvedValue(null);
      vi.mocked(db.user.count).mockResolvedValue(count);
      render(await RootPage());
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Your self-hosted workspace for the job search.",
        }),
      ).toBeInTheDocument();
      for (const link of screen.getAllByRole("link", { name: "Get started" })) {
        expect(link).toHaveAttribute(
          "href",
          count === 0 ? "/signup" : "/signin",
        );
      }
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/signin",
      );
      expect(
        screen.getByRole("link", { name: "View source on GitHub" }),
      ).toHaveAttribute("href", "https://github.com/Gsync/jobsync");
      expect(redirect).not.toHaveBeenCalled();
    },
  );
});
