import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { test, expect, uniqueName } from "./fixtures";

// Drives the real MCP protocol: creates a token through the Settings UI,
// then calls add_job over actual HTTP (JSON-RPC via the MCP SDK client)
// against the running dev server — exercising auth, routing, and
// handleAddJob end to end, not just the unit-tested function in isolation.
test.describe("MCP add_job", () => {
  test("creates a job via a real MCP tool call", async ({ page, baseURL, cleanup }) => {
    const tokenName = uniqueName("e2e mcp token");
    const jobTitle = uniqueName("mcp job title");
    const company = uniqueName("mcp company");

    await page.goto("/dashboard/settings");
    await page.getByText("MCP Access").click();
    await page.getByRole("button", { name: "Generate" }).click();
    await page.getByPlaceholder("e.g. Claude Desktop").fill(tokenName);
    await page.getByRole("button", { name: "Generate" }).click();
    cleanup.mcpToken(tokenName);

    const revealDialog = page.getByRole("dialog", { name: "Token Created" });
    await expect(revealDialog).toBeVisible();
    const token = await revealDialog.getByRole("textbox").inputValue();
    expect(token).toMatch(/^jsync_/);
    await page.getByRole("button", { name: "I saved my token" }).click();

    const transport = new StreamableHTTPClientTransport(
      new URL("/api/mcp", baseURL),
      { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const client = new Client({ name: "e2e-test-client", version: "1.0.0" });
    await client.connect(transport);

    const result = await client.callTool({
      name: "add_job",
      arguments: {
        company,
        jobTitle,
        jobDescription:
          "We are hiring a software engineer to build and maintain our core platform, work closely with product and design, and ship features end to end.",
        location: "Remote",
      },
    });
    await client.close();

    const text = (result.content as Array<{ type: string; text?: string }>)
      .map((c) => c.text ?? "")
      .join("\n");
    expect(text).toContain("Job created");

    const jobId = text.match(/Job created \(id: ([^)]+)\)/)?.[1];
    expect(jobId).toBeTruthy();
    cleanup.job(jobId!);
    cleanup.title(jobTitle);
    cleanup.company(company);

    await page.goto("/dashboard/myjobs");
    await expect(page.getByRole("row", { name: jobTitle }).first()).toBeVisible();
  });

  test("rejects a tool call with an invalid token", async ({ baseURL }) => {
    const transport = new StreamableHTTPClientTransport(
      new URL("/api/mcp", baseURL),
      { requestInit: { headers: { Authorization: "Bearer jsync_not-a-real-token" } } },
    );
    const client = new Client({ name: "e2e-test-client", version: "1.0.0" });

    await expect(client.connect(transport)).rejects.toThrow();
  });
});
