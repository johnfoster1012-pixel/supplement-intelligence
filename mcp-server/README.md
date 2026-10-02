# Supplement Intelligence MCP Worker

This directory contains the remote MCP server for the Supplement Intelligence ChatGPT plugin.

## Production endpoint

- MCP: https://mcp.supplement-intelligence.com/mcp
- Health: https://mcp.supplement-intelligence.com/health

The Worker is stateless and read-only. It uses the public Supplement Intelligence API as its source of truth.

## Tools

### search_supplement_intelligence
Search tracked products and reviewed ingredient evidence.

### get_ingredient_evidence
Return evidence posture, studied context, safety, product-directness notes, and sources for one reviewed ingredient.

### get_product_formulation
Return the current tracked product formulation, manufacturer source, evidence status, and linked ingredient evidence.

### list_reviewed_ingredients
List all currently reviewed ingredient evidence topics.

## Safety boundaries

The MCP server:
- does not diagnose or treat
- does not give personalized dosage recommendations
- does not rank supplements
- does not infer finished-product efficacy from ingredient presence
- does not write user data or perform external actions

## Local validation

```bash
cd mcp-server
npm install
npm run typecheck
npx wrangler deploy --dry-run
```

For protocol inspection, use MCP Inspector against the deployed or local `/mcp` endpoint.
