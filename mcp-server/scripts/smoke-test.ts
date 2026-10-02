import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.env.MCP_URL ?? "https://mcp.supplement-intelligence.com/mcp";
const expectedTools = [
  "search_supplement_intelligence",
  "get_ingredient_evidence",
  "get_product_formulation",
  "list_reviewed_ingredients",
];

const client = new Client({
  name: "supplement-intelligence-smoke-test",
  version: "1.0.0",
});

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));

  const { tools } = await client.listTools();
  const names = tools.map(tool => tool.name).sort();

  for (const expected of expectedTools) {
    if (!names.includes(expected)) {
      throw new Error(`Missing expected MCP tool: ${expected}`);
    }
  }

  const result = await client.callTool({
    name: "search_supplement_intelligence",
    arguments: { query: "creatine" },
  });

  if (result.isError) {
    throw new Error(`Tool returned isError: ${JSON.stringify(result.content)}`);
  }

  const serialized = JSON.stringify(result.structuredContent ?? result.content).toLowerCase();
  if (!serialized.includes("creatine")) {
    throw new Error("Creatine smoke-test call returned no creatine result.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint,
        tools: names,
        protocolEra: client.getProtocolEra(),
        server: client.getServerVersion(),
      },
      null,
      2
    )
  );
} finally {
  await client.close();
}
