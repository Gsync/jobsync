// Polyfills for Node.js globals required by Next.js 15
import { TextEncoder, TextDecoder } from "util";
import { ReadableStream, TransformStream } from "stream/web";

// Set up polyfills before any imports
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}
if (typeof global.ReadableStream === "undefined") {
  global.ReadableStream = ReadableStream as typeof global.ReadableStream;
}
if (typeof global.TransformStream === "undefined") {
  global.TransformStream = TransformStream as typeof global.TransformStream;
}

// Mock fetch API globals for Next.js 15
if (typeof global.Request === "undefined") {
  global.Request = class Request {} as any;
}
if (typeof global.Response === "undefined") {
  global.Response = class Response {} as any;
}
if (typeof global.Headers === "undefined") {
  global.Headers = class Headers {} as any;
}
