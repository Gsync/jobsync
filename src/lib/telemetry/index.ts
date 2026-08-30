export {
  CAPTURE_CONTENT,
  SERVICE_NAME,
  TELEMETRY_ENABLED,
} from "./config";
export { currentSpan, type ActiveSpan } from "./context";
export { runInSpan, startSpan, withSpan, type Span } from "./span";
export { type Attrs } from "./otlp";
