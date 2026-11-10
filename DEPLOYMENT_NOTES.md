# Supplement Intelligence deployment notes — verification rebuild

## Current architecture

- Cloudflare Worker: `worker.js` (v11.5)
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

## Unknown URLs, retired files and canonical URLs (v11.5)

- Unmatched paths are still checked against the legacy origin, but an HTML answer from it (its catch-all is the retired homepage) is replaced with a real `404` page. Non-HTML files at the origin, such as verification keys, still pass through.
- `/feed.xml`, `/humans.txt` and `/pages/*` return `410 Gone`.
- `www`, trailing-slash, upper-case and `.html` spellings of a page `301` to the canonical URL.
- `/BingSiteAuth.xml` and `/favicon.ico` / `/favicon.svg` are served by the Worker.
- The Worker wraps the home, index, ingredient and policy pages in one shared header and footer (`decorate()` in `worker.js`) and adds Open Graph tags and structured data. Ingredient pages take their title, description and "Last reviewed" date from `ingredient-evidence.json`.
- Product pages hide the FAQ and related sections when they are empty. Related products are derived from shared ingredient evidence links.
