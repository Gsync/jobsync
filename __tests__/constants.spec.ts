/**
 * Tests for isMockDataEnabled() helper in src/lib/constants.ts
 *
 * isMockDataEnabled() reads process.env at call time, so we manipulate
 * process.env directly and delete the module cache between cases to get a
 * clean read each time.
 */

describe("isMockDataEnabled", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;

  afterEach(() => {
    // Restore env to the state it was in before each test
    (process.env as any).NODE_ENV = originalNodeEnv;
    if (originalEnableMock === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = originalEnableMock;
    }
    jest.resetModules();
  });

  it("returns true when NODE_ENV is development", () => {
    (process.env as any).NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;

    // Re-require after resetting modules so constants reads the updated env
    const { isMockDataEnabled } = require("@/lib/constants");
    expect(isMockDataEnabled()).toBe(true);
  });

  it("returns true when NEXT_PUBLIC_ENABLE_MOCK_DATA is 'true' regardless of NODE_ENV", () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = "true";

    const { isMockDataEnabled } = require("@/lib/constants");
    expect(isMockDataEnabled()).toBe(true);
  });

  it("returns false in production without NEXT_PUBLIC_ENABLE_MOCK_DATA", () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;

    const { isMockDataEnabled } = require("@/lib/constants");
    expect(isMockDataEnabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_ENABLE_MOCK_DATA is 'false' and NODE_ENV is production", () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = "false";

    const { isMockDataEnabled } = require("@/lib/constants");
    expect(isMockDataEnabled()).toBe(false);
  });
});
