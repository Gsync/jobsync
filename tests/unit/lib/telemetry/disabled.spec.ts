import { loadTelemetry, mockFetchOk } from "./helpers";

describe("telemetry config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is disabled when no endpoint is set", async () => {
    const { config } = await loadTelemetry();
    expect(config.TELEMETRY_ENABLED).toBe(false);
    expect(config.CAPTURE_CONTENT).toBe(false);
    expect(config.TRACES_URL).toBe("");
  });

  it("derives the two OTLP urls from the base endpoint, trailing slash and all", async () => {
    const { config } = await loadTelemetry({
      endpoint: "http://homelab:5080/api/default/",
    });
    expect(config.TELEMETRY_ENABLED).toBe(true);
    expect(config.TRACES_URL).toBe("http://homelab:5080/api/default/v1/traces");
    expect(config.LOGS_URL).toBe("http://homelab:5080/api/default/v1/logs");
  });

  it("keeps content capture off unless the endpoint is also set", async () => {
    const off = await loadTelemetry({ captureContent: true });
    expect(off.config.CAPTURE_CONTENT).toBe(false);

    const on = await loadTelemetry({
      endpoint: "http://homelab:5080/api/default",
      captureContent: true,
    });
    expect(on.config.CAPTURE_CONTENT).toBe(true);
  });

  it("splits header pairs on the first '=' so base64 padding survives", async () => {
    const { config } = await loadTelemetry({
      endpoint: "http://homelab:5080/api/default",
      headers: "Authorization=Basic dXNlckBleGFtcGxlLmNvbTp0b2tlbg==,X-Extra=1",
    });
    expect(config.OTLP_HEADERS).toEqual({
      Authorization: "Basic dXNlckBleGFtcGxlLmNvbTp0b2tlbg==",
      "X-Extra": "1",
    });
  });
  it("allocates nothing and never touches fetch when disabled", async () => {
    const fetchMock = mockFetchOk();
    const { span, otlp } = await loadTelemetry();

    const a = span.startSpan("agent.chat.turn", { "jobsync.surface": "agent.chat" });
    const b = span.startSpan("agent.nested.review_resume");
    a.setAttrs({ "gen_ai.usage.input_tokens": 10 });
    a.setError(new Error("ignored"));
    a.end();
    b.end();

    // The same frozen no-op, not two objects.
    expect(a).toBe(b);
    expect(otlp.getTelemetryStats().queuedSpans).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runInSpan still runs the function when disabled", async () => {
    const { span } = await loadTelemetry();
    const noop = span.startSpan("x");
    expect(span.runInSpan(noop, () => "ran")).toBe("ran");
  });
});
