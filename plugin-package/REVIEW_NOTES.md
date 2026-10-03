# Plugin review notes

## Production MCP server
- URL: https://mcp.supplement-intelligence.com/mcp
- Transport: Streamable HTTP
- Authentication: none; V1 uses public read-only data only
- Production smoke test: MCP initialize, tools/list, and a live search tool call run after each deployment

## Tool annotation justifications

All four tools advertise readOnlyHint=true, destructiveHint=false, openWorldHint=true, and idempotentHint=true.

### search_supplement_intelligence
Read-only because it searches public product and ingredient records only; non-destructive because it performs no writes; open-world because the Worker reads public GitHub-hosted data; idempotent because repeated calls have no side effects.

### get_ingredient_evidence
Read-only because it retrieves one public evidence record; non-destructive because it cannot modify external state; open-world because it reads public GitHub-hosted data and returns public source URLs; idempotent because repeated calls do not change state.

### get_product_formulation
Read-only because it retrieves one tracked product formulation; non-destructive because it cannot modify data, inventory, purchases, or user state; open-world because it reads public GitHub-hosted data and can return public manufacturer URLs; idempotent because repeated calls do not change state.

### list_reviewed_ingredients
Read-only because it lists the public evidence catalog; non-destructive because it performs no writes; open-world because the backing source is publicly hosted; idempotent because repeated calls do not change state.

## Data handling
The tools request only a query, product slug, ingredient slug, or no input. They do not request PHI, medical records, diagnoses, contact details, credentials, payment data, government IDs, or precise location.

## Domain verification
The OpenAI submission dashboard will generate an exact verification token. Host that token at:
https://mcp.supplement-intelligence.com/.well-known/openai-apps-challenge
and complete Verify Domain before final submission.

## No custom UI
V1 returns structured MCP content only and does not advertise a UI output template. Screenshots are intentionally omitted.
