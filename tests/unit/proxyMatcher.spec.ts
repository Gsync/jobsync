import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

describe("proxy matcher", () => {
  it("exports the proxy handler under the Next 16 name", () => {
    expect(typeof proxy).toBe("function");
  });

  it.each([
    "/dashboard",
    "/dashboard/myjobs/abc",
    "/api/jobs/export",
    "/api/ai/chat",
  ])("guards %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each([
    "/api/auth/session",
    "/api/auth/callback/credentials",
    "/api/mcp",
    "/signin",
    "/",
  ])("leaves %s unguarded", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});
