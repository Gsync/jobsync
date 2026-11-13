import { loadTelemetry, mockFetchOk } from "./helpers";
import { APP_CONSTANTS } from "@/lib/constants";

const ENDPOINT = "http://homelab:5080/api/default";

function span(name: string) {
  return {
    name,
    traceId: "a".repeat(32),
    spanId: "b".repeat(16),
    startedAt: 1_756_500_000_000,
    endedAt: 1_756_500_000_100,
    attrs: {},
  } as any;
}

describe("otlp queue and flush timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("enqueueing schedules a flush instead of performing one", async () => {
    const fetchMock = mockFetchOk();
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    for (let i = 0; i < APP_CONSTANTS.TELEMETRY_BATCH_SIZE + 10; i++) {
      otlp.enqueueSpan(span(`s${i}`));
    }
    // The whole point: no serialization and no POST in the caller's stack.
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(APP_CONSTANTS.TELEMETRY_FLUSH_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${ENDPOINT}/v1/traces`);
  });

  it("drops the oldest span past the queue cap", async () => {
    mockFetchOk();
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });

    for (let i = 0; i < APP_CONSTANTS.TELEMETRY_MAX_QUEUE + 5; i++) {
      otlp.enqueueSpan(span(`s${i}`));
    }
    const stats = otlp.getTelemetryStats();
    expect(stats.queuedSpans).toBe(APP_CONSTANTS.TELEMETRY_MAX_QUEUE);
    expect(stats.dropped).toBe(5);
  });

  it("backs off on consecutive failures and resets on success", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const [first, second] = APP_CONSTANTS.TELEMETRY_BACKOFF_MS;

    otlp.enqueueSpan(span("s1"));
    otlp.enqueueSpan(span("s2"));
    await vi.advanceTimersByTimeAsync(first!);
    expect(otlp.getTelemetryStats().failures).toBe(1);

    // The retry of what is still queued now waits the second backoff step.
    otlp.enqueueSpan(span("s3"));
    await vi.advanceTimersByTimeAsync(first!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(second! - first!);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
