/**
 * Tests for src/lib/debug.ts — gated debug logging utility.
 *
 * debugLog / debugError check the DEBUG_LOGGING env variable at call time.
 * Default: enabled (logs unless DEBUG_LOGGING=false).
 */

import { debugLog, debugError } from "@/lib/debug";

describe("debugLog", () => {
  const originalDebugLogging = process.env.DEBUG_LOGGING;

  afterEach(() => {
    if (originalDebugLogging === undefined) {
      delete process.env.DEBUG_LOGGING;
    } else {
      process.env.DEBUG_LOGGING = originalDebugLogging;
    }
    jest.restoreAllMocks();
  });

  it("logs when DEBUG_LOGGING is not set (default enabled)", () => {
    delete process.env.DEBUG_LOGGING;
    const spy = jest.spyOn(console, "log").mockImplementation();

    debugLog("scheduler", "test message");

    expect(spy).toHaveBeenCalledWith("[scheduler]", "test message");
  });

  it("logs when DEBUG_LOGGING is 'true'", () => {
    process.env.DEBUG_LOGGING = "true";
    const spy = jest.spyOn(console, "log").mockImplementation();

    debugLog("runner", "running");

    expect(spy).toHaveBeenCalledWith("[runner]", "running");
  });

  it("does not log when DEBUG_LOGGING is 'false'", () => {
    process.env.DEBUG_LOGGING = "false";
    const spy = jest.spyOn(console, "log").mockImplementation();

    debugLog("scheduler", "should not appear");

    expect(spy).not.toHaveBeenCalled();
  });

  it("prefixes output with the category in brackets", () => {
    delete process.env.DEBUG_LOGGING;
    const spy = jest.spyOn(console, "log").mockImplementation();

    debugLog("automationLogger", "msg");

    expect(spy).toHaveBeenCalledWith("[automationLogger]", "msg");
  });

  it("passes multiple arguments through", () => {
    delete process.env.DEBUG_LOGGING;
    const spy = jest.spyOn(console, "log").mockImplementation();

    debugLog("scheduler", "a", 1, { key: "val" });

    expect(spy).toHaveBeenCalledWith("[scheduler]", "a", 1, { key: "val" });
  });
});

describe("debugError", () => {
  const originalDebugLogging = process.env.DEBUG_LOGGING;

  afterEach(() => {
    if (originalDebugLogging === undefined) {
      delete process.env.DEBUG_LOGGING;
    } else {
      process.env.DEBUG_LOGGING = originalDebugLogging;
    }
    jest.restoreAllMocks();
  });

  it("logs to stderr when DEBUG_LOGGING is not set (default enabled)", () => {
    delete process.env.DEBUG_LOGGING;
    const spy = jest.spyOn(console, "error").mockImplementation();

    debugError("scheduler", "error message");

    expect(spy).toHaveBeenCalledWith("[scheduler]", "error message");
  });

  it("does not log to stderr when DEBUG_LOGGING is 'false'", () => {
    process.env.DEBUG_LOGGING = "false";
    const spy = jest.spyOn(console, "error").mockImplementation();

    debugError("runner", "should not appear");

    expect(spy).not.toHaveBeenCalled();
  });

  it("passes multiple arguments through to console.error", () => {
    delete process.env.DEBUG_LOGGING;
    const spy = jest.spyOn(console, "error").mockImplementation();
    const err = new Error("test");

    debugError("automationLogger", "failed:", err);

    expect(spy).toHaveBeenCalledWith("[automationLogger]", "failed:", err);
  });
});
