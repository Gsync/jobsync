// Read once, at module load. That is what makes "disabled" genuinely free:
// startSpan and log return immediately, no queue exists, fetch is never
// referenced. Nothing else in the app reads process.env for telemetry.

function parseHeaders(raw: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const pair of (raw ?? "").split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    // First "=" only: an Authorization value is base64 and carries its own.
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    headers[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }
  return headers;
}

const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "")
  .trim()
  .replace(/\/+$/, "");

export const TELEMETRY_ENABLED = endpoint.length > 0;

// Two independent stages: content capture has no effect without an endpoint.
export const CAPTURE_CONTENT =
  TELEMETRY_ENABLED && process.env.OTEL_CAPTURE_CONTENT === "true";

export const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "jobsync";

// The base/suffix split is the OTel convention, and is what keeps the backend
// swappable for Seq, Tempo or SigNoz by changing one URL.
export const TRACES_URL = TELEMETRY_ENABLED ? `${endpoint}/v1/traces` : "";
export const LOGS_URL = TELEMETRY_ENABLED ? `${endpoint}/v1/logs` : "";

export const OTLP_HEADERS = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);
