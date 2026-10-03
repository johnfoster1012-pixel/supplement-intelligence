import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import productsSnapshot from "../data/products-data.json";
import ingredientSnapshot from "../data/ingredient-evidence.json";

const SERVER_NAME = "supplement-intelligence";
const SERVER_VERSION = "1.1.0";
const DATA_SOURCE = "bundled-repository-snapshot";
const PRODUCTS_DOC = productsSnapshot as unknown as JsonObject;
const INGREDIENT_DOC = ingredientSnapshot as unknown as JsonObject;
const PRODUCT_DATA_VERSION = String(PRODUCTS_DOC.generatedAt ?? PRODUCTS_DOC.catalogCheckedAt ?? "unknown");
const INGREDIENT_DATA_VERSION = String(INGREDIENT_DOC.generated_at ?? "unknown");
const DATA_VERSION = `products:${PRODUCT_DATA_VERSION};ingredients:${INGREDIENT_DATA_VERSION}`;

interface Env {
  OPENAI_APPS_CHALLENGE?: string;
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

type JsonObject = Record<string, unknown>;

const SEARCH_ALIASES: Record<string, string[]> = {
  "fish oil": ["omega 3", "omega-3", "long chain omega 3", "epa dha"],
  "omega 3": ["fish oil", "omega-3", "long chain omega 3", "epa dha"],
  "omega-3": ["fish oil", "omega 3", "long chain omega 3", "epa dha"],
  "d3": ["vitamin d", "vitamin d3"],
  "vitamin d3": ["vitamin d", "d3"],
  "coq10": ["coenzyme q10", "co q10"],
  "coenzyme q10": ["coq10", "co q10"],
  "ala": ["alpha lipoic acid", "alpha-lipoic acid"],
  "alpha lipoic acid": ["ala", "alpha-lipoic acid"],
  "turmeric": ["curcumin"],
  "curcumin": ["turmeric"],
  "msm": ["methylsulfonylmethane"],
  "methylsulfonylmethane": ["msm"],
  "citrulline malate": ["citrulline", "l citrulline"],
  "l citrulline": ["citrulline", "citrulline malate"],
  "l arginine": ["arginine"],
  "arginine": ["l arginine"],
};

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[+/_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTerms(query: string): string[] {
  const normalized = normalizeSearchText(query);
  const terms = new Set<string>([normalized]);
  for (const [key, aliases] of Object.entries(SEARCH_ALIASES)) {
    if (normalized === key || normalized.includes(key)) {
      terms.add(key);
      aliases.forEach((alias) => terms.add(normalizeSearchText(alias)));
    }
  }
  return [...terms].filter(Boolean);
}

function matchesSearch(values: unknown[], terms: string[]): boolean {
  const haystack = normalizeSearchText(values.map((v) => String(v ?? "")).join(" "));
  return terms.some((term) => haystack.includes(term));
}

function getProductsDocument(): JsonObject {
  return PRODUCTS_DOC;
}

function getIngredientDocument(): JsonObject {
  return INGREDIENT_DOC;
}

function extractIsoDate(value: unknown): string | null {
  const match = String(value ?? "").match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match ? match[1] : null;
}

function logToolEvent(tool: string, status: "success" | "error", startedAt: number): void {
  console.log(JSON.stringify({
    event: "mcp_tool_call",
    tool,
    status,
    duration_ms: Date.now() - startedAt,
    data_version: DATA_VERSION,
  }));
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
        const [productsDoc, ingredientDoc] = await Promise.all([
          getProductsDocument(),
          getIngredientDocument(),
        ]);

        const q = query.trim().toLowerCase();
        const productMap =
          productsDoc.products && typeof productsDoc.products === "object"
            ? (productsDoc.products as Record<string, JsonObject>)
            : {};
        const ingredientMap =
          ingredientDoc.ingredients && typeof ingredientDoc.ingredients === "object"
            ? (ingredientDoc.ingredients as Record<string, JsonObject>)
            : {};

        const productResults = Object.values(productMap)
          .filter((p) =>
            [p.name, p.slug, p.ingredients].some((v) =>
              String(v ?? "").toLowerCase().includes(q)
            )
          )
          .slice(0, 20)
          .map((p) => ({
            type: "product" as const,
            slug: String(p.slug ?? ""),
            name: String(p.name ?? ""),
            canonical_url: `https://supplement-intelligence.com/products/${String(p.slug ?? "")}`,
            formulation_status: p.formulationStatus == null ? null : String(p.formulationStatus),
            evidence_status: String(p.evidenceGrade ?? "Under Review"),
          }));

        const ingredientResults = Object.entries(ingredientMap)
          .filter(([slug, x]) =>
            [slug, x.name, x.posture, x.summary].some((v) =>
              String(v ?? "").toLowerCase().includes(q)
            )
          )
          .slice(0, 20)
          .map(([slug, x]) => ({
            type: "ingredient" as const,
            slug,
            name: String(x.name ?? slug),
            canonical_url: `https://supplement-intelligence.com/ingredients/${slug}`,
            evidence_posture: String(x.posture ?? ""),
          }));

        const results = [...ingredientResults, ...productResults];
        const output = {
          query: q,
          count: results.length,
          results,
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
        const doc = await getIngredientDocument();
        const map =
          doc.ingredients && typeof doc.ingredients === "object"
            ? (doc.ingredients as Record<string, JsonObject>)
            : {};
        const data = map[slug];
        if (!data) throw new Error("Ingredient not found.");

        const output = {
          slug,
          canonical_url: `https://supplement-intelligence.com/ingredients/${slug}`,
          name: String(data.name ?? slug),
          posture: String(data.posture ?? ""),
          summary: String(data.summary ?? ""),
          studied_context: String(data.studied_context ?? ""),
          safety: String(data.safety ?? ""),
          product_directness: String(data.product_directness ?? ""),
          products: Array.isArray(data.products) ? data.products.map(String) : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          interpretation:
            "Ingredient-level evidence is not proof that a finished product has the same effect.",
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
        const doc = await getProductsDocument();
        const map =
          doc.products && typeof doc.products === "object"
            ? (doc.products as Record<string, JsonObject>)
            : {};
        const data = map[slug];
        if (!data) throw new Error("Product not found.");

        const output = {
          slug,
          name: String(data.name ?? slug),
          canonical_url: `https://supplement-intelligence.com/products/${slug}`,
          ingredients: data.ingredients == null ? null : String(data.ingredients),
          formulation_status:
            data.formulationStatus == null ? null : String(data.formulationStatus),
          formulation_source:
            data.formulationSource == null ? null : String(data.formulationSource),
          evidence_status: String(data.evidenceGrade ?? "Under Review"),
          evidence_note:
            data.evidenceGradeText == null ? null : String(data.evidenceGradeText),
          ingredient_evidence_links: Array.isArray(data.ingredientEvidenceLinks)
            ? data.ingredientEvidenceLinks
            : [],
          commercial_disclosure:
            "Supplement Intelligence may earn referral credit from some product links.",
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
        const doc = await getIngredientDocument();
        const map =
          doc.ingredients && typeof doc.ingredients === "object"
            ? (doc.ingredients as Record<string, JsonObject>)
            : {};
        const ingredients = Object.entries(map).map(([slug, x]) => ({
          slug,
          name: String(x.name ?? slug),
          canonical_url: `https://supplement-intelligence.com/ingredients/${slug}`,
          evidence_posture: String(x.posture ?? ""),
          related_products: Array.isArray(x.products) ? x.products.map(String) : [],
        }));
        const output = {
          count: ingredients.length,
          ingredients,
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/openai-apps-challenge") {
      if (!env.OPENAI_APPS_CHALLENGE) {
        return new Response("Not configured", { status: 404 });
      }
      return new Response(env.OPENAI_APPS_CHALLENGE, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "supplement-intelligence-mcp",
        version: SERVER_VERSION,
        data_source: DATA_BASE,
      });
    }

    if (url.pathname === "/") {
      return Response.json({
        name: "Supplement Intelligence MCP",
        version: SERVER_VERSION,
        data_source: DATA_BASE,
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
