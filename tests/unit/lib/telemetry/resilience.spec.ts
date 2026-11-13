import { loadTelemetry, mockFetchOk } from "./helpers";
import { APP_CONSTANTS } from "@/lib/constants";

const ENDPOINT = "http://homelab:5080/api/default";

describe("telemetry never breaks a request", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("swallows a rejecting fetch", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const { span, otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    span.startSpan("probe").end();
    await expect(
      vi.advanceTimersByTimeAsync(APP_CONSTANTS.TELEMETRY_FLUSH_INTERVAL_MS),
    ).resolves.not.toThrow();
    expect(otlp.getTelemetryStats().failures).toBe(1);
    vi.useRealTimers();
  });

  it("swallows a synchronous throw from a hostile attrs object", async () => {
    mockFetchOk();
    const { span } = await loadTelemetry({ endpoint: ENDPOINT });

    const hostile = {
      get "jobsync.surface"() {
        throw new TypeError("no");
      },
    };

    expect(() => span.startSpan("probe", hostile as any)).not.toThrow();
    const live = span.startSpan("probe");
    expect(() => live.setAttrs(hostile as any)).not.toThrow();
    expect(() => live.end(hostile as any)).not.toThrow();
  });

  it("drops a record whose attribute cannot be serialized without losing the batch", async () => {
    const fetchMock = mockFetchOk();
    vi.useFakeTimers();
    const { span, otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    span.startSpan("bad").end({ "jobsync.payload": circular });
    span.startSpan("good").end();

    await vi.advanceTimersByTimeAsync(APP_CONSTANTS.TELEMETRY_FLUSH_INTERVAL_MS);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    const names = body.resourceSpans[0].scopeSpans[0].spans.map(
      (s: any) => s.name,
    );
    expect(names).toEqual(["good"]);
    expect(otlp.getTelemetryStats().failures).toBe(0);
    vi.useRealTimers();
  });

  it("propagates the wrapped function's own error while still ending the span", async () => {
    mockFetchOk();
    const { span, otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    await expect(
      span.withSpan("boom", {}, async () => {
        throw new Error("application failure");
      }),
    ).rejects.toThrow("application failure");
    expect(otlp.getTelemetryStats().queuedSpans).toBe(1);
  });
});
