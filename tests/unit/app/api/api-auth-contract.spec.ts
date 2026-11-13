// Contract tests: every session-guarded API route must reject anonymous
// requests. This locks in the defense-in-depth `auth()` check each handler
// performs on top of the proxy matcher (see src/proxy.ts).

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// NextResponse.json uses Response.json() internally; provide a working stub.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

vi.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: vi.fn(),
}));

import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/api-key-resolver";

import { POST as verifyApiKey } from "@/app/api/settings/api-keys/verify/route";
import { POST as exportJobs } from "@/app/api/jobs/export/route";
import { POST as cancelAutomation } from "@/app/api/automations/[id]/cancel/route";
import { POST as clearLogs } from "@/app/api/automations/[id]/logs/clear/route";
import {
  GET as getResume,
  POST as postResume,
} from "@/app/api/profile/resume/route";
import { POST as agentChat } from "@/app/api/ai/chat/route";
import { GET as openaiModels } from "@/app/api/ai/openai/models/route";
import { GET as geminiModels } from "@/app/api/ai/gemini/models/route";
import { GET as deepseekModels } from "@/app/api/ai/deepseek/models/route";
import { GET as openrouterModels } from "@/app/api/ai/openrouter/models/route";

const anonAuth = () => (auth as any).mockResolvedValue(null);

// Minimal Request stub — guarded handlers return 401 before touching the body.
const req = () => ({ json: async () => ({}), url: "http://localhost/x" }) as any;
const params = { params: Promise.resolve({ id: "automation-1" }) };

describe("API auth contract: guarded routes reject anonymous requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    anonAuth();
  });

  it("POST /api/settings/api-keys/verify -> 401", async () => {
    const res = await verifyApiKey(req());
    expect(res.status).toBe(401);
  });

  it("POST /api/jobs/export -> 401", async () => {
    const res = await exportJobs();
    expect(res.status).toBe(401);
  });

  it("POST /api/automations/[id]/cancel -> 401", async () => {
    const res = await cancelAutomation(req(), params);
    expect(res.status).toBe(401);
  });

  it("POST /api/automations/[id]/logs/clear -> 401", async () => {
    const res = await clearLogs(req(), params);
    expect(res.status).toBe(401);
  });

  it("GET /api/profile/resume -> 401", async () => {
    const res = await getResume(req());
    expect(res!.status).toBe(401);
  });

  it("POST /api/profile/resume -> 401", async () => {
    const res = await postResume(req());
    expect(res!.status).toBe(401);
  });

  it("POST /api/ai/chat -> 401", async () => {
    const res = await agentChat(req());
    expect(res.status).toBe(401);
  });

  it.each([
    ["openai", openaiModels],
    ["gemini", geminiModels],
    ["deepseek", deepseekModels],
    ["openrouter", openrouterModels],
  ])("GET /api/ai/%s/models -> 401 before resolving a key", async (_, handler) => {
    const res = await handler();
    expect(res.status).toBe(401);
    expect(resolveApiKey).not.toHaveBeenCalled();
  });
});
