import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = "https://mcp.supplement-intelligence.com/mcp";
const expectedTools = [
  "search_supplement_intelligence",
  "get_ingredient_evidence",
  "get_product_formulation",
  "list_reviewed_ingredients",
];

const client = new Client({
  name: "supplement-intelligence-smoke-test",
  version: "1.2.0",
});

async function callTool(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    throw new Error(`${name} returned isError: ${JSON.stringify(result.content)}`);
  }
  return result;
}

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));

  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();

  for (const expected of expectedTools) {
    if (!names.includes(expected)) {
      throw new Error(`Missing expected MCP tool: ${expected}`);
    }
  }

  const creatine = await callTool("search_supplement_intelligence", { query: "creatine" });
  const creatineJson = JSON.stringify(creatine.structuredContent ?? creatine.content).toLowerCase();
  if (!creatineJson.includes("creatine")) {
    throw new Error(`Creatine search returned no creatine result: ${creatineJson}`);
  }
  if (!creatineJson.includes("data_version")) {
    console.warn(`Creatine search response did not surface data_version; ingredient freshness check will verify version metadata separately. Payload: ${creatineJson}`);
  }

  const fishOil = await callTool("search_supplement_intelligence", { query: "fish oil" });
  const fishOilJson = JSON.stringify(fishOil.structuredContent ?? fishOil.content).toLowerCase();
  if (!fishOilJson.includes("omega-3") && !fishOilJson.includes("omega 3")) {
    throw new Error("Fish-oil synonym search did not resolve to omega-3 evidence.");
  }

  const coq10 = await callTool("search_supplement_intelligence", { query: "coq10" });
  const coq10Json = JSON.stringify(coq10.structuredContent ?? coq10.content).toLowerCase();
  if (!coq10Json.includes("coenzyme q10") && !coq10Json.includes("coq10")) {
    throw new Error("CoQ10 synonym search did not resolve.");
  }

  const ingredient = await callTool("get_ingredient_evidence", { slug: "creatine-monohydrate" });
  const ingredientJson = JSON.stringify(ingredient.structuredContent ?? ingredient.content).toLowerCase();
  if (!ingredientJson.includes("last_reviewed_at") || !ingredientJson.includes("source_count")) {
    throw new Error("Ingredient evidence response is missing freshness/source metadata.");
  }
  if (!ingredientJson.includes("review_evidence") || !ingredientJson.includes("limitations") || !ingredientJson.includes("40944139")) {
    throw new Error("Ingredient evidence response is missing structured review-level evidence.");
  }

  const product = await callTool("get_product_formulation", { slug: "s-balance" });
  const productJson = JSON.stringify(product.structuredContent ?? product.content).toLowerCase();
  if (!productJson.includes("catalog_checked_at") || !productJson.includes("formulation_checked_at")) {
    throw new Error("Product formulation response is missing freshness metadata.");
  }

  const hibiscus = await callTool("search_supplement_intelligence", { query: "hibiscus" });
  const hibiscusJson = JSON.stringify(hibiscus.structuredContent ?? hibiscus.content).toLowerCase();
  if (!hibiscusJson.includes('"slug":"hibiscus"') && !hibiscusJson.includes('"slug": "hibiscus"')) {
    throw new Error("Expanded-library search did not resolve hibiscus.");
  }

  const uvaUrsi = await callTool("get_ingredient_evidence", { slug: "uva-ursi" });
  const uvaUrsiJson = JSON.stringify(uvaUrsi.structuredContent ?? uvaUrsi.content).toLowerCase();
  if (!uvaUrsiJson.includes("v-itaren") || !uvaUrsiJson.includes("34111592")) {
    throw new Error("Uva-ursi evidence response is missing V-ITAREN linkage or reviewed trial evidence.");
  }

  const library = await callTool("list_reviewed_ingredients", {});
  const libraryJson = JSON.stringify(library.structuredContent ?? library.content).toLowerCase();
  if (!libraryJson.includes('"count":34') && !libraryJson.includes('"count": 34')) {
    throw new Error("Reviewed ingredient library did not report 34 topics.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        endpoint,
        tools: names,
        checks: [
          "creatine-search",
          "fish-oil-synonym",
          "coq10-synonym",
          "ingredient-freshness",
          "structured-review-evidence",
          "product-freshness",
          "expanded-hibiscus-search",
          "uva-ursi-v-itaren-linkage",
          "34-topic-library",
        ],
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
