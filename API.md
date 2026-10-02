# Supplement Intelligence Data Interface

Supplement Intelligence is being rebuilt around verification-first formulation and ingredient evidence.

## Current machine-readable files

### Product formulations
`products-data.json`

Contains the current manufacturer-page formulation record for each product. These records establish product composition only. They do not establish efficacy.

### Product label verification
`data/product-label-verification.json`

Tracks when each product formulation was checked, the manufacturer source, and evidence-review status.

### Ingredient evidence
`ingredient-evidence.json`

Contains the current verified ingredient-level evidence layer for priority ingredients.

Each ingredient record separates:
- evidence posture
- summary of supported findings
- studied context
- safety context
- product directness
- related products
- primary or authoritative sources

### Evidence method
`docs/EVIDENCE_METHOD.md`

Defines source hierarchy, required study metadata, directness rules, and publication requirements.

## Important interpretation rule

Ingredient-level evidence is not automatically evidence for a finished product.

Before a finished-product claim is published, the ingredient, formulation, dose, population, duration, outcome, and study context must be sufficiently relevant to the current product.

## Retired data

Earlier comprehensive datasets and the first Ashwagandha, Berberine, and NAC study-database assets were withdrawn because their citation-to-product mappings did not consistently meet the current verification standard.

Do not use historical citation totals or retired A/B/C grades as current evidence.

## API direction

A future API or MCP interface should read only from the current verified data files above and should expose evidence status and product-directness fields explicitly.
