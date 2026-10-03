# Plugin review notes

## Production MCP server
- URL: https://mcp.supplement-intelligence.com/mcp
- Transport: Streamable HTTP
- Authentication: none; V1 uses public read-only data only
- Production smoke test: MCP initialize, tools/list, and a live search tool call run after each deployment

## Tool annotation justifications

All four tools advertise readOnlyHint=true, destructiveHint=false, openWorldHint=false, and idempotentHint=true.

### search_supplement_intelligence
Read-only because it searches public product and ingredient records only; non-destructive because it performs no writes; closed-world because V1.1 reads a bundled, versioned repository snapshot and does not make external network calls during tool execution; idempotent because repeated calls have no side effects.

### get_ingredient_evidence
Read-only because it retrieves one public evidence record; non-destructive because it cannot modify external state; closed-world because it reads the bundled evidence snapshot; returned source URLs are metadata and are not fetched by the tool; idempotent because repeated calls do not change state.

### get_product_formulation
Read-only because it retrieves one tracked product formulation; non-destructive because it cannot modify data, inventory, purchases, or user state; closed-world because it reads the bundled product snapshot; manufacturer URLs are returned as metadata and are not fetched by the tool; idempotent because repeated calls do not change state.

### list_reviewed_ingredients
Read-only because it lists the public evidence catalog; non-destructive because it performs no writes; closed-world because the backing evidence catalog is bundled into the Worker at deployment; idempotent because repeated calls do not change state.

## Data handling
The tools request only a query, product slug, ingredient slug, or no input. They do not request PHI, medical records, diagnoses, contact details, credentials, payment data, government IDs, or precise location.

## Domain verification
The OpenAI submission dashboard will generate an exact verification token. Host that token at:
https://mcp.supplement-intelligence.com/.well-known/openai-apps-challenge
and complete Verify Domain before final submission.

## No custom UI
V1 returns structured MCP content only and does not advertise a UI output template. Screenshots are intentionally omitted.

## V1.1 data freshness
The MCP Worker bundles generated snapshots of the root `products-data.json` and `ingredient-evidence.json` source files at deployment. The sync step runs automatically before validation/deployment, and generated copies are not maintained in Git. Tool outputs expose explicit data-version and review/check-date fields so ChatGPT does not need to infer freshness from prose.

## Operational telemetry
V1.1 logs only tool name, success/error status, latency, and data version. Query text, ingredient/product input, medical details, and returned content are not logged by the application telemetry wrapper.

## V1.2 review evidence
Selected ingredient records include a structured `review_evidence` array derived from verified systematic reviews, meta-analyses, umbrella reviews, or comparable higher-level human evidence. Each record includes the finding and limitations together. These records remain ingredient-level evidence and are never treated as proof of a tracked finished product.
