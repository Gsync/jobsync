import { serializeByUser } from "@/lib/jobs/serializeByUser";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("serializeByUser", () => {
  it("runs one user's calls in order, without overlap", async () => {
    const events: string[] = [];
    const task = (name: string) => async () => {
      events.push(`${name}:start`);
      await tick();
      events.push(`${name}:end`);
    };

    await Promise.all([serializeByUser("u1", task("a")), serializeByUser("u1", task("b"))]);

    expect(events).toEqual(["a:start", "a:end", "b:start", "b:end"]);
  });

  it("does not hold one user's call behind another user's", async () => {
    const events: string[] = [];
    const slow = serializeByUser("u1", async () => {
      await tick();
      events.push("u1");
    });
    const fast = serializeByUser("u2", async () => {
      events.push("u2");
    });

    await Promise.all([slow, fast]);

    expect(events).toEqual(["u2", "u1"]);
  });

  it("stops waiting for a stuck call after 5 seconds", async () => {
    vi.useFakeTimers();
    try {
      void serializeByUser("stuck", () => new Promise<void>(() => {}));
      const next = vi.fn(async () => "ran");
      const result = serializeByUser("stuck", next);

      await vi.advanceTimersByTimeAsync(4_999);
      expect(next).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe("ran");
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes a rejection to its caller and still runs the next call", async () => {
    const failed = serializeByUser("u1", async () => {
      throw new Error("boom");
    });
    const next = serializeByUser("u1", async () => "ran");

    await expect(failed).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ran");
  });
});
