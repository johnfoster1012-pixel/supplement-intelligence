# Supplement Intelligence patch set

## What this patch changes

1. Replaces the Worker with `worker_v8.js`.
2. Fixes direct index routes for:
   - `/products`
   - `/articles`
   - `/ingredients` (new)
   - `/formulary` alias to `/products`
   - `/research` alias to `/articles`
3. Adds a first-pass ingredient research layer:
   - `/ingredients/glutathione`
   - `/ingredients/marine-collagen-peptides`
   - `/ingredients/curcumin`
   - `/ingredients/omega-3-fatty-acids`
   - `/ingredients/bacopa-monnieri`
4. Adds `llm.txt` and a rebuilt `sitemap.xml`.
5. Preserves all existing product URLs and existing article URLs.
6. Normalizes mojibake / encoding artifacts in rendered text.

## Recommended deployment order

1. Upload these new files to the repo root and subfolders exactly as included.
2. Swap your active worker script to `worker_v8.js`.
3. Purge CDN / Cloudflare cache.
4. Verify:
   - `/products`
   - `/articles`
   - `/ingredients`
   - `/products/v-glutation`
   - `/ingredients/glutathione`
   - `/llm.txt`
   - `/sitemap.xml`

## Notes on ingredient verification

The new ingredient pages were anchored to your current product corpus and cross-checked against the Vital Health catalog page you supplied. Any product-to-ingredient expansion beyond these first five should be verified against the live Vital Health product pages before publishing.
