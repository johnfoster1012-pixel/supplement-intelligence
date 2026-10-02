# Supplement Intelligence plugin tool design

This document maps the current read-only Supplement Intelligence API to a future MCP-backed ChatGPT plugin.

## Design principle

The plugin should answer user questions with standalone research utility. It should not exist primarily as an affiliate funnel. Ingredient evidence and finished-product efficacy must remain distinct.

OpenAI's current plugin guidance recommends exposing focused tools that correspond to recognizable user goals rather than mirroring an internal API one-for-one.

## Recommended MCP tools

### search_supplement_intelligence
User goal: Find relevant products or ingredient evidence from natural-language terms.

Backend source:
- `products-data.json`
- `ingredient-evidence.json`
- search is performed inside the MCP Worker

Suggested annotation:
- readOnlyHint: true

### get_ingredient_evidence
User goal: Understand the evidence, studied context, safety, and source quality for a specific ingredient.

Backend source:
- `ingredient-evidence.json`

Suggested annotation:
- readOnlyHint: true

Important response behavior:
- clearly separate ingredient-level findings from finished-product efficacy
- preserve uncertainty and source type
- surface safety context without diagnosing or prescribing

### get_product_formulation
User goal: Inspect the current manufacturer-verified formulation status of a tracked product and see which ingredient evidence pages are relevant.

Backend source:
- `products-data.json`

Suggested annotation:
- readOnlyHint: true

Important response behavior:
- do not imply that presence of an ingredient means the product reproduces trial results
- explicitly show evidence_status
- show when a complete manufacturer ingredient panel is unavailable

### list_reviewed_ingredients
User goal: Browse the current reviewed evidence library.

Backend source:
- `ingredient-evidence.json`

Suggested annotation:
- readOnlyHint: true

## Deferred tools

Do not add these until the underlying evidence model supports them reliably:

- compare_products
- rank_supplements
- recommend_supplement
- check_personal_eligibility
- dosage_recommendation

Those workflows require additional clinical/directness judgment and may create medical or product-ranking implications that the current data does not support.

## Future MCP implementation

Use the official MCP SDK:
- TypeScript: @modelcontextprotocol/sdk
- Python: mcp

The remote MCP server should expose a small set of focused read-only tools backed by the API above. The current site/API can remain the source of truth.

For public plugin submission, the MCP endpoint must be publicly accessible and its tool metadata, schemas, annotations, and instructions should accurately reflect actual behavior.
