import { NextResponse } from "next/server";
import { resolveMcpToken } from "@/lib/mcp/auth";

export const MAX_BODY_BYTES = 128 * 1024;

export async function workerAuth(request: Request) {
  const auth = await resolveMcpToken(request);
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  if (!auth.scopes.includes("evaluations:worker")) return { error: NextResponse.json({ error: "Missing evaluations:worker scope" }, { status: 403 }) };
  return { userId: auth.userId };
}

export async function boundedJson(request: Request, maximum = MAX_BODY_BYTES): Promise<{ value: unknown } | { error: NextResponse }> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) {
    return { error: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
  }
  const reader = request.body?.getReader();
  if (!reader) return { error: NextResponse.json({ error: "Expected JSON body" }, { status: 400 }) };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) return { error: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
    chunks.push(value);
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) };
  } catch {
    return { error: NextResponse.json({ error: "Malformed JSON" }, { status: 400 }) };
  }
}

export function stringField(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}
