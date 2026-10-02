# Supplement Intelligence deployment notes — verification rebuild

## Current architecture

- Cloudflare Worker: `worker.js` (v10)
- Current product data: `products-data.json`
- Label-verification ledger: `data/product-label-verification.json`
- Ingredient evidence: `ingredient-evidence.json`
- Evidence method: `docs/EVIDENCE_METHOD.md`
- AI guidance: `llm.txt` and `llms.txt`
- Sitemap: `sitemap.xml`

## Key routes to verify after deployment

- `/`
- `/products`
- `/products/v-control`
- `/products/s-balance`
- `/ingredients`
- `/ingredients/creatine-monohydrate`
- `/ingredients/berberine`
- `/ingredients/ashwagandha`
- `/ingredients/curcumin`
- `/ingredients/glutathione`
- `/about`
- `/references`
- `/disclaimer`
- `/llm.txt`
- `/llms.txt`
- `/robots.txt`
- `/sitemap.xml`

## Retired routes/data

The first Ashwagandha, Berberine, and NAC study database was retired. `/database` now routes to the research-status page and the obsolete machine-readable study assets have been removed.

## Pricing

The Worker serves a price-free canonical homepage. Supplement Intelligence does not display merchant pricing on its main site.

## Evidence publication rule

Do not publish an efficacy claim solely because an ingredient appears in a product. Follow `docs/EVIDENCE_METHOD.md`.
