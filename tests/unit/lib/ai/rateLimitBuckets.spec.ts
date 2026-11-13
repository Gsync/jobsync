import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { APP_CONSTANTS, RATE_LIMITS } from "@/lib/constants";

// The limiter holds module-level state, so every test uses its own user id.
describe("checkRateLimit buckets", () => {
  it("keeps the chat bucket independent of the default bucket", () => {
    const userId = "user-buckets-1";
    for (let i = 0; i < RATE_LIMITS.CHAT_MAX_REQUESTS; i++) {
      expect(checkRateLimit(userId, "chat").allowed).toBe(true);
    }
    expect(checkRateLimit(userId, "chat").allowed).toBe(false);
    expect(checkRateLimit(userId).allowed).toBe(true);
  });

  it("keeps the default bucket at its existing limit", () => {
    const userId = "user-buckets-2";
    for (let i = 0; i < RATE_LIMITS.MAX_REQUESTS; i++) {
      expect(checkRateLimit(userId).allowed).toBe(true);
    }
    expect(checkRateLimit(userId).allowed).toBe(false);
  });

  it("allows more chat requests than default requests", () => {
    expect(RATE_LIMITS.CHAT_MAX_REQUESTS).toBeGreaterThan(RATE_LIMITS.MAX_REQUESTS);
  });

  it("exposes the agent chat constants the feature depends on", () => {
    expect(APP_CONSTANTS.AGENT_CHAT_MAX_STEPS).toBe(4);
    // The threshold sits below the head so every chipped paste has its
    // opening shown to the model in full, and the head stays a bounded
    // window into a much larger ceiling. This replaced a head < threshold * 2
    // ratio that only described the original 1500-char threshold.
    expect(APP_CONSTANTS.AGENT_CHAT_PASTE_THRESHOLD).toBeLessThan(
      APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS,
    );
    expect(APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS).toBeLessThan(
      APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS,
    );
    expect(APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS).toBeGreaterThan(
      APP_CONSTANTS.AGENT_CHAT_PASTE_THRESHOLD,
    );
    // 2 is the floor: the paste must survive one clarifying exchange.
    expect(APP_CONSTANTS.AGENT_CHAT_PASTE_ACTIVE_USER_MESSAGES).toBeGreaterThanOrEqual(2);
    expect(APP_CONSTANTS.AGENT_CHAT_TIMEOUT_MS).toBeGreaterThan(
      APP_CONSTANTS.AI_RESUME_REVIEW_TIMEOUT_MS,
    );
    expect(APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES).toBeLessThan(
      APP_CONSTANTS.AGENT_CHAT_MAX_STORED_MESSAGES,
    );
  });
});
