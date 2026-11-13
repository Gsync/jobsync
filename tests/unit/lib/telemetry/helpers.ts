import { vi } from "vitest";

type TelemetryEnv = {
  endpoint?: string;
  captureContent?: boolean;
  headers?: string;
  serviceName?: string;
};

// config.ts reads process.env once at module load, so every scenario needs a
// fresh module graph. The ALS and the queue live on globalThis and survive
// resetModules, hence the explicit queue reset below.
export async function loadTelemetry(env: TelemetryEnv = {}) {
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", env.endpoint ?? "");
  vi.stubEnv("OTEL_CAPTURE_CONTENT", env.captureContent ? "true" : "false");
  vi.stubEnv("OTEL_EXPORTER_OTLP_HEADERS", env.headers ?? "");
  vi.stubEnv("OTEL_SERVICE_NAME", env.serviceName ?? "jobsync-test");
  vi.resetModules();

  const otlp = await import("@/lib/telemetry/otlp");
  otlp.resetTelemetryStateForTests();

  return {
    config: await import("@/lib/telemetry/config"),
    span: await import("@/lib/telemetry/span"),
    genai: await import("@/lib/telemetry/genai"),
    logger: await import("@/lib/telemetry/logger"),
    otlp,
  };
}

export function mockFetchOk() {
  // Typed like fetch so specs can read the url and body off mock.calls.
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
