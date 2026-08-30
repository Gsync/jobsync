import { loadTelemetry } from "./helpers";
import { APP_CONSTANTS } from "@/lib/constants";

const ENDPOINT = "http://homelab:5080/api/default";

function span(overrides: Record<string, unknown> = {}) {
  return {
    name: "agent.chat.turn",
    traceId: "5b8aa5a2d2c872e8321cf37308d69df2",
    spanId: "051581bf3cb55c13",
    startedAt: 1_756_500_000_000,
    endedAt: 1_756_500_001_000,
    attrs: {},
    ...overrides,
  } as any;
}

describe("otlp payload shape", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("nests resourceSpans / scopeSpans and carries service.name", async () => {
    const { otlp } = await loadTelemetry({
      endpoint: ENDPOINT,
      serviceName: "jobsync-test",
    });
    const payload = otlp.buildTracePayload([span()]) as any;

    expect(payload.resourceSpans).toHaveLength(1);
    expect(payload.resourceSpans[0].resource.attributes).toContainEqual({
      key: "service.name",
      value: { stringValue: "jobsync-test" },
    });
    const encoded = payload.resourceSpans[0].scopeSpans[0].spans[0];
    expect(encoded.traceId).toBe("5b8aa5a2d2c872e8321cf37308d69df2");
    expect(encoded.spanId).toBe("051581bf3cb55c13");
    expect(encoded.parentSpanId).toBeUndefined();
    expect(encoded.kind).toBe(1);
    expect(encoded.startTimeUnixNano).toBe("1756500000000000000");
    expect(encoded.endTimeUnixNano).toBe("1756500001000000000");
  });

  it("types attribute values: string, int, double, bool, and JSON for objects", async () => {
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const payload = otlp.buildTracePayload([
      span({
        attrs: {
          "gen_ai.request.model": "qwen3.5:9b",
          "gen_ai.usage.input_tokens": 1234,
          "gen_ai.request.temperature": 0.1,
          "jobsync.prefix_changed": true,
          "gen_ai.prompt": { role: "user", content: "hi" },
        },
      }),
    ]) as any;
    const attrs = payload.resourceSpans[0].scopeSpans[0].spans[0].attributes;
    const byKey = Object.fromEntries(attrs.map((a: any) => [a.key, a.value]));

    expect(byKey["gen_ai.request.model"]).toEqual({ stringValue: "qwen3.5:9b" });
    expect(byKey["gen_ai.usage.input_tokens"]).toEqual({ intValue: "1234" });
    expect(byKey["gen_ai.request.temperature"]).toEqual({ doubleValue: 0.1 });
    expect(byKey["jobsync.prefix_changed"]).toEqual({ boolValue: true });
    expect(byKey["gen_ai.prompt"]).toEqual({
      stringValue: '{"role":"user","content":"hi"}',
    });
  });

  it("caps an oversized value and names the capped key", async () => {
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const huge = "x".repeat(APP_CONSTANTS.TELEMETRY_MAX_ATTR_CHARS + 500);
    const payload = otlp.buildTracePayload([
      span({ attrs: { "gen_ai.prompt": huge } }),
    ]) as any;
    const attrs = payload.resourceSpans[0].scopeSpans[0].spans[0].attributes;
    const byKey = Object.fromEntries(attrs.map((a: any) => [a.key, a.value]));

    expect(byKey["gen_ai.prompt"].stringValue).toHaveLength(
      APP_CONSTANTS.TELEMETRY_MAX_ATTR_CHARS,
    );
    // The telemetry cap is a different fact from jobsync.input.truncated:
    // the model still saw the whole thing.
    expect(byKey["jobsync.telemetry.capped_attrs"]).toEqual({
      stringValue: "gen_ai.prompt",
    });
  });

  it("sets an error status when the span recorded one", async () => {
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const payload = otlp.buildTracePayload([
      span({ error: true, errorMessage: "boom" }),
    ]) as any;
    expect(payload.resourceSpans[0].scopeSpans[0].spans[0].status).toEqual({
      code: 2,
      message: "boom",
    });
  });

  it("builds a log payload with severity, body and trace correlation", async () => {
    const { otlp } = await loadTelemetry({ endpoint: ENDPOINT });
    const payload = otlp.buildLogPayload([
      {
        timestamp: 1_756_500_000_000,
        severityNumber: 17,
        severityText: "ERROR",
        body: "scrape failed",
        attrs: { "automation.id": "a1" },
        traceId: "5b8aa5a2d2c872e8321cf37308d69df2",
        spanId: "051581bf3cb55c13",
      },
    ]) as any;
    const record = payload.resourceLogs[0].scopeLogs[0].logRecords[0];

    expect(record.timeUnixNano).toBe("1756500000000000000");
    expect(record.severityNumber).toBe(17);
    expect(record.severityText).toBe("ERROR");
    expect(record.body).toEqual({ stringValue: "scrape failed" });
    expect(record.traceId).toBe("5b8aa5a2d2c872e8321cf37308d69df2");
  });
});
