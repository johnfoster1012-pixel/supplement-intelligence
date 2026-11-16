# Triage of the old `articles/` pages

Checked Nov 15, 2026. Read-only; nothing was changed.

## Result

The 38 old article pages are already retired. Each file is a short "being updated" stub marked `noindex`, and `worker.js` answers every `/articles/<slug>` URL with a 301 redirect before the stub is ever served. No article content, and no citation, remains in these files.

So there is nothing to refresh or remove for search. Three small improvements are worth a decision.

## Recommendations

| # | Item | Today | Recommendation | Why |
| --- | --- | --- | --- | --- |
| 1 | `/articles/l-theanine-focus` and `/articles/l-theanine-vs-caffeine` | 301 to `/products` | 301 to `/ingredients/l-theanine` | A reviewed page on the same topic exists; a closer match keeps more of any remaining search value |
| 2 | `/articles` (the "Research Library" index) | Live, indexable, about 60 words, not in the sitemap | 301 to `/ingredients` | It is a thin page that only points elsewhere |
| 3 | The 38 stub files in `articles/` | Never served; the worker redirects first | Delete the files, keep the redirects in `worker.js` | Dead files; removing them also drops `articles/**` as a deploy trigger |

Items 1 and 2 are two-line changes to `ARTICLE_REDIRECTS` and the `/articles` route in `worker.js`. Item 3 is a file deletion. None is applied here; each needs the owner's OK.

## Current redirect map

| Old URL pattern | Count | Redirects to |
| --- | --- | --- |
| `/articles/<product>-benefits` | 27 | `/products/<product>` |
| `/articles/nourish-plus-kids-benefits` | 1 | `/products/nourish-plus` |
| `/articles/lions-mane-benefits` | 1 | `/products/lattekaffe` |
| `/articles/v-neurokafe-vs-coffee` | 1 | `/products/v-neurokafe` |
| `bacopa-memory`, `best-nootropic-work`, `best-supplement-students`, `complete-guide`, `dosage-side-effects`, `l-theanine-focus`, `l-theanine-vs-caffeine`, `top-5-ingredients` | 8 | `/products` |

No ingredient page exists yet for bacopa or lion's mane, so those two stay where they are. If reviews are added later, point `bacopa-memory` and `lions-mane-benefits` at them.
