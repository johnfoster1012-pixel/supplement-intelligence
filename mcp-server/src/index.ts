import { search, norm, type Catalog } from "./search";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import productsSnapshot from "../data/products-data.json";
import ingredientSnapshot from "../data/ingredient-evidence.json";

import { checkClaim, claimInput, compareLabel, labelInput } from "./verify";
import revision from "../data/revision.json";
import guides from "../data/guides.json";

const SERVER_NAME = "supplement-intelligence";
const SERVER_VERSION = "1.3.0";
const DATA_SOURCE = "bundled-repository-snapshot";
const PRODUCTS_DOC = productsSnapshot as unknown as JsonObject;
const INGREDIENT_DOC = ingredientSnapshot as unknown as JsonObject;
const PRODUCT_DATA_VERSION = String(PRODUCTS_DOC.generatedAt ?? PRODUCTS_DOC.catalogCheckedAt ?? "unknown");
const INGREDIENT_DATA_VERSION = String(INGREDIENT_DOC.generated_at ?? "unknown");
const DATA_VERSION = `products:${PRODUCT_DATA_VERSION};ingredients:${INGREDIENT_DATA_VERSION}`;

const ingredientMap = INGREDIENT_DOC.ingredients as Catalog;
const productMap = PRODUCTS_DOC.products as Catalog;

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
  match_kind: z.string(),
  requested_form: z.string().optional(),
  applicability: z.string().optional(),
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

const reviewEvidenceSchema = z.object({
  title: z.string(),
  pmid: z.string(),
  study_type: z.string(),
  population: z.string(),
  evidence_scope: z.string(),
  finding: z.string(),
  limitations: z.string(),
  directness: z.enum([
    "Direct human evidence",
    "Relevant human evidence",
    "Preliminary human evidence",
    "Mechanistic evidence",
  ]),
  verified_at: z.string(),
  url: z.string().url(),
});

function toolOutput(fields: Record<string, unknown>) {
  const value={...fields,data_version:DATA_VERSION,snapshot_revision:revision.id};
  return {content:[{type:"text" as const,text:JSON.stringify(value)}],structuredContent:value};
}
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
        query_normalized: z.string(),
        data_version: z.string(),
        snapshot_revision: z.string(),
        count: z.number().int().nonnegative(),
        results: z.array(searchResultSchema),
      }),
      annotations: readOnlyAnnotations,
    },
    async ({ query }) => {
      const startedAt = Date.now();
      try {
        const q = norm(query);
        const results = search(query, ingredientMap, productMap);
        const output = {
          query: query.trim(),
          query_normalized: q,
          data_version: DATA_VERSION,
          snapshot_revision: revision.id,
          count: results.length,
          results,
        };
        logToolEvent("search_supplement_intelligence", "success", startedAt);
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
        logToolEvent("search_supplement_intelligence", "error", startedAt);
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
        data_version: z.string(),
        snapshot_revision: z.string(),
        last_reviewed_at: z.string(),
        last_automated_source_check: z.string().nullable(),
        source_count: z.number().int().nonnegative(),
        review_evidence_count: z.number().int().nonnegative(),
        name: z.string(),
        posture: z.string(),
        summary: z.string(),
        studied_context: z.string(),
        safety: z.string(),
        product_directness: z.string(),
        products: z.array(z.string()),
        sources: z.array(sourceSchema),
        review_evidence: z.array(reviewEvidenceSchema),
        interpretation: z.string(),
      }),
      annotations: readOnlyAnnotations,
    },
    async ({ slug }) => {
      const startedAt = Date.now();
      try {
        const doc = getIngredientDocument();
        const map =
          doc.ingredients && typeof doc.ingredients === "object"
            ? (doc.ingredients as Record<string, JsonObject>)
            : {};
        const data = map[slug];
        if (!data) throw new Error("Ingredient not found.");

        const sources = Array.isArray(data.sources) ? data.sources : [];
        const reviewEvidence = Array.isArray(data.review_evidence) ? data.review_evidence : [];
        const output = {
          slug,
          canonical_url: `https://supplement-intelligence.com/ingredients/${slug}`,
          data_version: INGREDIENT_DATA_VERSION,
          snapshot_revision: revision.id,
          last_reviewed_at: String(data.last_reviewed_at ?? "unknown"),
          last_automated_source_check: null, // Offline triage reports are not a completed evidence review.
          source_count: sources.length,
          review_evidence_count: reviewEvidence.length,
          name: String(data.name ?? slug),
          posture: String(data.posture ?? ""),
          summary: String(data.summary ?? ""),
          studied_context: String(data.studied_context ?? ""),
          safety: String(data.safety ?? ""),
          product_directness: String(data.product_directness ?? ""),
          products: Array.isArray(data.products) ? data.products.map(String) : [],
          sources,
          review_evidence: reviewEvidence,
          interpretation:
            "Ingredient-level evidence is not proof that a finished product has the same effect.",
        };
        logToolEvent("get_ingredient_evidence", "success", startedAt);
        return {
          content: [
            {
              type: "text",
              text: `${output.name}: ${output.posture} Reviewed ${output.last_reviewed_at}. Source: ${output.canonical_url}`,
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        logToolEvent("get_ingredient_evidence", "error", startedAt);
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
        data_version: z.string(),
        snapshot_revision: z.string(),
        catalog_checked_at: z.string(),
        formulation_checked_at: z.string().nullable(),
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
      const startedAt = Date.now();
      try {
        const doc = getProductsDocument();
        const map =
          doc.products && typeof doc.products === "object"
            ? (doc.products as Record<string, JsonObject>)
            : {};
        const data = map[slug];
        if (!data) throw new Error("Product not found.");

        const formulationStatus =
          data.formulationStatus == null ? null : String(data.formulationStatus);
        const output = {
          slug,
          name: String(data.name ?? slug),
          canonical_url: `https://supplement-intelligence.com/products/${slug}`,
          data_version: PRODUCT_DATA_VERSION,
          snapshot_revision: revision.id,
          catalog_checked_at: String(doc.catalogCheckedAt ?? "unknown"),
          formulation_checked_at: extractIsoDate(formulationStatus),
          ingredients: data.ingredients == null ? null : String(data.ingredients),
          formulation_status: formulationStatus,
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
        logToolEvent("get_product_formulation", "success", startedAt);
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
        logToolEvent("get_product_formulation", "error", startedAt);
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
        data_version: z.string(),
        snapshot_revision: z.string(),
        last_reviewed_at: z.string(),
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
      const startedAt = Date.now();
      try {
        const doc = getIngredientDocument();
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
          data_version: INGREDIENT_DATA_VERSION,
          snapshot_revision: revision.id,
          last_reviewed_at: "unknown", // No catalog-wide evidence-review date is recorded.
          count: ingredients.length,
          ingredients,
        };
        logToolEvent("list_reviewed_ingredients", "success", startedAt);
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
        logToolEvent("list_reviewed_ingredients", "error", startedAt);
        return asToolError(error);
      }
    }
  );

  const guideInput = z.object({ query: z.string().trim().min(2).max(120) });
  server.registerTool("find_educational_guides", {
    description:"Find published Supplement Intelligence educational guides about GLP-1 topics. Guides are not trial evidence.",
    inputSchema:guideInput, annotations:readOnlyAnnotations
  }, async ({query})=>{
    const words=norm(query).split(" ").filter(Boolean);
    const results=guides.filter(g=>words.length>0 && words.every(w=>(" "+norm(g.title+" "+g.url.split("/").slice(3).join(" "))+" ").includes(" "+w+" ")));
    return toolOutput({count:results.length,results});
  });
  server.registerTool("check_supplement_claim", {
    description:"Check exact claim wording against curated outcome assessments. Extract only the label claim, ingredient, product if applicable and measured outcome. Missing coverage is not evidence of no effect.",
    inputSchema:claimInput,annotations:readOnlyAnnotations
  }, async input=>toolOutput(checkClaim(input,ingredientMap,undefined,productMap)));
  server.registerTool("compare_supplement_label", {
    description:"Compare ingredients and quantities transcribed from a label with reviewed research. Mark unreadable values; omit unstated amounts. Only send label facts.",
    inputSchema:labelInput,annotations:readOnlyAnnotations
  }, async input=>toolOutput(compareLabel(input,ingredientMap,undefined,productMap)));
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
        data_source: DATA_SOURCE,
        data_version: DATA_VERSION,
      });
    }

    if (url.pathname === "/") {
      return Response.json({
        name: "Supplement Intelligence MCP",
        version: SERVER_VERSION,
        data_source: DATA_SOURCE,
        data_version: DATA_VERSION,
        mcp_endpoint: "https://mcp.supplement-intelligence.com/mcp",
        health: "https://mcp.supplement-intelligence.com/health",
        tools: [
          "search_supplement_intelligence",
          "get_ingredient_evidence",
          "get_product_formulation",
          "list_reviewed_ingredients", "check_supplement_claim", "compare_supplement_label", "find_educational_guides",
        ],
      });
    }

    if (url.pathname !== "/mcp") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return mcpHandler.fetch(request);
  },
};
