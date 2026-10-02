import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const API_BASE = "https://supplement-intelligence.com/api/v1";
const SERVER_NAME = "supplement-intelligence";
const SERVER_VERSION = "1.0.0";

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
  idempotentHint: true,
} as const;

type JsonObject = Record<string, unknown>;

async function fetchJson(path: string): Promise<JsonObject> {
  const response = await fetch(API_BASE + path, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Supplement-Intelligence-MCP/1.0",
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // handled below
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as JsonObject).error)
        : `Supplement Intelligence API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Supplement Intelligence API returned an invalid response.");
  }

  return payload as JsonObject;
}

function asToolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected MCP tool error.";
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

const searchResultSchema = z.object({
  type: z.enum(["ingredient", "product"]),
  slug: z.string(),
  name: z.string(),
  canonical_url: z.string().url(),
  evidence_posture: z.string().optional(),
  formulation_status: z.string().nullable().optional(),
  evidence_status: z.string().optional(),
});

const sourceSchema = z.object({
  type: z.string(),
  title: z.string(),
  url: z.string().url(),
  pmid: z.string().optional(),
});

function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Use these tools for Supplement Intelligence's reviewed supplement ingredient evidence and current tracked product formulations. Distinguish ingredient-level evidence from finished-product efficacy. Do not infer dosage, diagnosis, treatment, or personalized medical recommendations. Preserve uncertainty, safety context, and source URLs.",
    }
  );

  server.registerTool(
    "search_supplement_intelligence",
    {
      title: "Search Supplement Intelligence",
      description:
        "Search Supplement Intelligence when the user wants to find a tracked supplement product or a reviewed ingredient evidence page. Returns matching ingredient and product records only; it does not search the open web and does not recommend a supplement.",
      inputSchema: z.object({
        query: z
          .string()
          .trim()
          .min(2)
          .max(120)
          .describe("Ingredient or product search text, for example 'creatine', 'magnesium', or 'PERFORMANCE PLUS'."),
      }),
      outputSchema: z.object({
        query: z.string(),
        count: z.number().int().nonnegative(),
        results: z.array(searchResultSchema),
      }),
      annotations: readOnlyAnnotations,
    },
    async ({ query }) => {
      try {
        const data = await fetchJson(`/search?q=${encodeURIComponent(query)}`);
        const output = {
          query: String(data.query ?? query),
          count: Number(data.count ?? 0),
          results: Array.isArray(data.results) ? data.results : [],
        };
        return {
          content: [
            {
              type: "text",
              text:
                output.count === 0
                  ? `No Supplement Intelligence records matched "${query}".`
                  : `Found ${output.count} Supplement Intelligence record(s) matching "${query}".`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return asToolError(error);
      }
    }
  );

  server.registerTool(
    "get_ingredient_evidence",
    {
      title: "Get ingredient evidence",
      description:
        "Retrieve Supplement Intelligence's reviewed evidence record for one ingredient. Use this for questions about what human evidence supports, studied context, safety, source quality, and whether tracked products directly match the research. This is ingredient-level evidence, not proof of finished-product efficacy.",
      inputSchema: z.object({
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]+$/)
          .max(100)
          .describe("Canonical ingredient slug, for example 'creatine-monohydrate', 'berberine', or 'vitamin-d'."),
      }),
      outputSchema: z.object({
        slug: z.string(),
        canonical_url: z.string().url(),
        name: z.string(),
        posture: z.string(),
        summary: z.string(),
        studied_context: z.string(),
        safety: z.string(),
        product_directness: z.string(),
        products: z.array(z.string()),
        sources: z.array(sourceSchema),
        interpretation: z.string(),
      }),
      annotations: readOnlyAnnotations,
    },
    async ({ slug }) => {
      try {
        const data = await fetchJson(`/ingredients/${encodeURIComponent(slug)}`);
        const output = {
          slug: String(data.slug ?? slug),
          canonical_url: String(data.canonical_url ?? `https://supplement-intelligence.com/ingredients/${slug}`),
          name: String(data.name ?? slug),
          posture: String(data.posture ?? ""),
          summary: String(data.summary ?? ""),
          studied_context: String(data.studied_context ?? ""),
          safety: String(data.safety ?? ""),
          product_directness: String(data.product_directness ?? ""),
          products: Array.isArray(data.products) ? data.products.map(String) : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          interpretation: String(
            data.interpretation ??
              "Ingredient-level evidence is not proof that a finished product has the same effect."
          ),
        };
        return {
          content: [
            {
              type: "text",
              text: `${output.name}: ${output.posture} Source: ${output.canonical_url}`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return asToolError(error);
      }
    }
  );

  server.registerTool(
    "get_product_formulation",
    {
      title: "Get product formulation",
      description:
        "Retrieve the current tracked formulation status for one Supplement Intelligence product, including manufacturer source, evidence status, and links to reviewed ingredient evidence. Use this to inspect what a product currently contains; do not infer that the finished product reproduces ingredient trial results.",
      inputSchema: z.object({
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]+$/)
          .max(100)
          .describe("Canonical product slug, for example 'performance-plus', 's-balance', or 'v-omega3'."),
      }),
      outputSchema: z.object({
        slug: z.string(),
        name: z.string(),
        canonical_url: z.string().url(),
        ingredients: z.string().nullable(),
        formulation_status: z.string().nullable(),
        formulation_source: z.string().url().nullable(),
        evidence_status: z.string(),
        evidence_note: z.string().nullable(),
        ingredient_evidence_links: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            url: z.string(),
            posture: z.string(),
          })
        ),
        commercial_disclosure: z.string(),
      }),
      annotations: readOnlyAnnotations,
    },
    async ({ slug }) => {
      try {
        const data = await fetchJson(`/products/${encodeURIComponent(slug)}`);
        const output = {
          slug: String(data.slug ?? slug),
          name: String(data.name ?? slug),
          canonical_url: String(data.canonical_url ?? `https://supplement-intelligence.com/products/${slug}`),
          ingredients: data.ingredients == null ? null : String(data.ingredients),
          formulation_status: data.formulation_status == null ? null : String(data.formulation_status),
          formulation_source: data.formulation_source == null ? null : String(data.formulation_source),
          evidence_status: String(data.evidence_status ?? "Under Review"),
          evidence_note: data.evidence_note == null ? null : String(data.evidence_note),
          ingredient_evidence_links: Array.isArray(data.ingredient_evidence_links)
            ? data.ingredient_evidence_links
            : [],
          commercial_disclosure: String(
            data.commercial_disclosure ??
              "Supplement Intelligence may earn referral credit from some product links."
          ),
        };
        return {
          content: [
            {
              type: "text",
              text: `${output.name}: formulation status — ${output.formulation_status ?? "not verified"}; evidence status — ${output.evidence_status}. Source: ${output.canonical_url}`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return asToolError(error);
      }
    }
  );

  server.registerTool(
    "list_reviewed_ingredients",
    {
      title: "List reviewed ingredients",
      description:
        "List the ingredient evidence topics currently reviewed and published by Supplement Intelligence. Use this when the user wants to browse available evidence topics rather than search for one known ingredient.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        count: z.number().int().nonnegative(),
        ingredients: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            canonical_url: z.string().url(),
            evidence_posture: z.string(),
            related_products: z.array(z.string()),
          })
        ),
      }),
      annotations: readOnlyAnnotations,
    },
    async () => {
      try {
        const data = await fetchJson("/ingredients");
        const output = {
          count: Number(data.count ?? 0),
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        };
        return {
          content: [
            {
              type: "text",
              text: `Supplement Intelligence currently has ${output.count} reviewed ingredient evidence record(s).`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return asToolError(error);
      }
    }
  );

  return server;
}

const mcpHandler = createMcpHandler(() => createServer());

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "supplement-intelligence-mcp",
        version: SERVER_VERSION,
        api: API_BASE,
      });
    }

    if (url.pathname === "/") {
      return Response.json({
        name: "Supplement Intelligence MCP",
        version: SERVER_VERSION,
        mcp_endpoint: "https://mcp.supplement-intelligence.com/mcp",
        health: "https://mcp.supplement-intelligence.com/health",
        tools: [
          "search_supplement_intelligence",
          "get_ingredient_evidence",
          "get_product_formulation",
          "list_reviewed_ingredients",
        ],
      });
    }

    if (url.pathname !== "/mcp") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return mcpHandler.fetch(request);
  },
};
