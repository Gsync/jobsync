import { loadTelemetry, mockFetchOk } from "./helpers";

const ENDPOINT = "http://homelab:5080/api/default";

describe("telemetry logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("always writes to console, telemetry off", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logger, otlp } = await loadTelemetry();

    logger.log.info("[Scheduler] tick", { automationId: "a1" });

    expect(info).toHaveBeenCalledWith("[Scheduler] tick", { automationId: "a1" });
    expect(otlp.getTelemetryStats().queuedLogs).toBe(0);
  });

  it("writes to console AND enqueues, telemetry on", async () => {
    mockFetchOk();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger, otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    logger.log.error("scrape failed", { automationId: "a1" });

    expect(error).toHaveBeenCalledWith("scrape failed", { automationId: "a1" });
    expect(otlp.getTelemetryStats().queuedLogs).toBe(1);
  });

  it("inherits trace_id and span_id from the active span", async () => {
    const fetchMock = mockFetchOk();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { logger, span, otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    const parent = span.startSpan("automation.run");
    span.runInSpan(parent, () => logger.log.info("inside the run"));
    parent.end();

    await vi.advanceTimersByTimeAsync(5_000);
    const logsCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/v1/logs"),
    )!;
    const body = JSON.parse(logsCall[1]!.body as string);
    const record = body.resourceLogs[0].scopeLogs[0].logRecords[0];

    expect(record.traceId).toBe(parent.traceId);
    expect(record.spanId).toBe(parent.spanId);
    expect(otlp.getTelemetryStats().dropped).toBe(0);
    vi.useRealTimers();
  });

  it("maps levels to OTLP severity numbers", async () => {
    mockFetchOk();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger, otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    logger.log.info("i");
    logger.log.warn("w");
    logger.log.error("e");

    expect(otlp.getTelemetryStats().queuedLogs).toBe(3);
    expect(logger.SEVERITY).toEqual({ info: 9, warn: 13, error: 17 });
  });

  it("does not throw when the console call itself fails", async () => {
    mockFetchOk();
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("stdout closed");
    });
    const { logger } = await loadTelemetry({ endpoint: ENDPOINT });

    expect(() => logger.log.error("boom")).not.toThrow();
  });
});
