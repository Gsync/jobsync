export const rpc = (body: object) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...body }),
  });

export async function listTools(
  post: (req: Request) => Promise<Response>,
): Promise<{ name: string; inputSchema: unknown }[]> {
  await post(
    rpc({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "parity-spec", version: "1.0.0" },
      },
    }),
  );
  const res = await post(rpc({ id: 2, method: "tools/list", params: {} }));
  const json = await res.json();
  return json.result.tools;
}
