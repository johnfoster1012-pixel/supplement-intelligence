# Supplement Intelligence API

The public API is read-only and exposes the current verification-first product and ingredient evidence model.

Base URL:

`https://supplement-intelligence.com/api/v1`

## Endpoints

### API index
`GET /api/v1`

Returns API version, record counts, and endpoint discovery.

### Search
`GET /api/v1/search?q=creatine`

Searches reviewed ingredient evidence and current product formulation records.

### Products
`GET /api/v1/products`

Returns current tracked products with formulation status, formulation source, evidence status, and linked ingredient evidence.

`GET /api/v1/products/{slug}`

Returns one product's current formulation record.

### Ingredients
`GET /api/v1/ingredients`

Returns the reviewed ingredient evidence index.

`GET /api/v1/ingredients/{slug}`

Returns evidence posture, summary, studied context, safety context, product-directness notes, related products, and sources.

## OpenAPI

`GET /openapi.json`

The OpenAPI 3.1 contract is intended for developers and future tool/MCP integration.

## Interpretation rules

1. Ingredient-level evidence is not automatically finished-product evidence.
2. Manufacturer pages establish formulation facts only; they do not establish efficacy.
3. Products marked Under Review do not have a finalized finished-product evidence grade.
4. A missing complete ingredient panel is represented explicitly rather than inferred from marketing copy.

## CORS and caching

The API allows cross-origin read access for GET/HEAD requests and uses short public caching.

## Plugin preparation

See `plugin/TOOL_DESIGN.md` for the proposed MCP tool surface.

## Deployment status

Deployment health checks verify the API index, search, ingredient, product, and OpenAPI endpoints after each relevant production deploy.


## Structured review-level evidence

Ingredient-detail responses may include a `review_evidence` array. Each entry represents a verified higher-level human evidence source and includes:

- PMID and source URL
- study/review type
- population or review scope
- evidence scope/outcome
- main finding
- important limitations
- evidence directness
- verification date

A pooled or statistically significant finding must not be interpreted as a finished-product efficacy claim. Review-level summaries also must not be used to infer an exact dose, formulation, duration, or comparator unless that detail is explicitly supplied.
