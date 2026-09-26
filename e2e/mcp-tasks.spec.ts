import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { test, expect, uniqueName } from "./fixtures";

function resultJson(result: unknown) {
  const content = (result as { content?: unknown }).content;
  const text = (content as Array<{ type: string; text?: string }>)
    .map((item) => item.text ?? "")
    .join("");
  return JSON.parse(text);
}

test("creates and completes a task through the real MCP transport", async ({
  page,
  baseURL,
  cleanup,
}) => {
  const tokenName = uniqueName("e2e mcp task token");
  const taskTitle = uniqueName("MCP task");
  const activityType = uniqueName("MCP activity type");

  await page.goto("/dashboard/settings");
  await page.getByText("MCP Access").click();
  await page.getByRole("button", { name: "Generate" }).click();
  await page.getByPlaceholder("e.g. Claude Desktop").fill(tokenName);
  await page.getByRole("button", { name: "Generate" }).click();
  cleanup.mcpToken(tokenName);
  cleanup.task(taskTitle);
  cleanup.activityType(activityType);

  const revealDialog = page.getByRole("dialog", { name: "Token Created" });
  const token = await revealDialog.getByRole("textbox").inputValue();
  await page.getByRole("button", { name: "I saved my token" }).click();

  const transport = new StreamableHTTPClientTransport(
    new URL("/api/mcp", baseURL),
    { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const client = new Client({ name: "e2e-task-client", version: "1.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name)).toEqual(
    expect.arrayContaining([
      "list_tasks",
      "get_task",
      "create_task",
      "update_task",
      "complete_task",
    ]),
  );

  const created = resultJson(
    await client.callTool({
      name: "create_task",
      arguments: {
        title: taskTitle,
        description: "Follow up <safely> & confirm",
        priority: 7,
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        activityType,
      },
    }),
  ).task;
  expect(created).toEqual(
    expect.objectContaining({
      title: taskTitle,
      description: "Follow up <safely> & confirm",
      status: "in-progress",
      priority: 7,
      percentComplete: 0,
    }),
  );

  const listed = resultJson(
    await client.callTool({
      name: "list_tasks",
      arguments: { search: taskTitle, activityType },
    }),
  );
  expect(listed.tasks.map((task: { id: string }) => task.id)).toContain(created.id);

  const retrieved = resultJson(
    await client.callTool({
      name: "get_task",
      arguments: { taskId: created.id },
    }),
  ).task;
  expect(retrieved.id).toBe(created.id);

  const updated = resultJson(
    await client.callTool({
      name: "update_task",
      arguments: {
        taskId: created.id,
        priority: 9,
        description: null,
        dueDate: null,
        activityType: null,
      },
    }),
  ).task;
  expect(updated).toEqual(
    expect.objectContaining({
      priority: 9,
      description: "",
      dueDate: null,
      activityType: null,
    }),
  );

  const completed = resultJson(
    await client.callTool({
      name: "complete_task",
      arguments: { taskId: created.id },
    }),
  ).task;
  expect(completed).toEqual(
    expect.objectContaining({ status: "complete", percentComplete: 100 }),
  );
  await client.close();

  await page.goto("/dashboard/tasks");
  await page.getByTestId("add-task-btn").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Status", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Complete" }).click();
  const row = page.getByRole("row", { name: new RegExp(taskTitle, "i") });
  await expect(row).toContainText("Complete");
  await expect(row).toContainText("100%");
});
