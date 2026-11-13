# Nov 11 site page drafts (review only, not published)

These 10 pages were drafted on Nov 11, 2026 (America/Chicago) by ChatGPT Codex cloud tasks for supplement-intelligence.com. Each file is the page body exactly as drafted, pulled from the saved task diffs. This branch only adds files under `drafts/`. Do not merge it to main, because merging main publishes the live site.

| # | File | Target URL | Drafted | PubMed links found |
|---|------|-----------|---------|-------|
| 1 | glp-1/retatrutide.html | https://supplement-intelligence.com/glp-1/retatrutide | 2026-11-11 | 8 |
| 2 | glp-1/muscle-loss.html | https://supplement-intelligence.com/glp-1/muscle-loss | 2026-11-11 | 7 |
| 3 | glp-1/oral-glp-1.html | https://supplement-intelligence.com/glp-1/oral-glp-1 | 2026-11-11 | 8 |
| 4 | glp-1/tirzepatide-side-effects.html | https://supplement-intelligence.com/glp-1/tirzepatide-side-effects | 2026-11-11 | 3 |
| 5 | glp-1/tirzepatide-vs-semaglutide.html | https://supplement-intelligence.com/glp-1/tirzepatide-vs-semaglutide | 2026-11-11 | 4 |
| 6 | ingredients/creatine-hcl-vs-monohydrate.html | https://supplement-intelligence.com/ingredients/creatine-hcl-vs-monohydrate | 2026-11-11 | 3 |
| 7 | ingredients/creatine-weight-gain.html | https://supplement-intelligence.com/ingredients/creatine-weight-gain | 2026-11-11 | 5 |
| 8 | ingredients/magnesium-glycinate-vs-citrate.html | https://supplement-intelligence.com/ingredients/magnesium-glycinate-vs-citrate | 2026-11-11 | 5 |
| 9 | ingredients/magnesium-l-threonate-vs-glycinate.html | https://supplement-intelligence.com/ingredients/magnesium-l-threonate-vs-glycinate | 2026-11-11 | 4 |
| 10 | peptides/bpc-157.html | https://supplement-intelligence.com/peptides/bpc-157 | 2026-11-11 | 6 |

"PubMed links found" counts unique pubmed.ncbi.nlm.nih.gov links in the file. Pages may cite other sources (DOIs, FDA labels) too.

## Format

These are full HTML files with their own head (title, meta description, canonical, and JSON-LD where drafted). At serve time, the site's Cloudflare Worker (`worker.js`) adds the header, footer, CSS, breadcrumbs, "Last reviewed" line and MedicalWebPage JSON-LD. A page also needs its slug registered in `worker.js` and its URL in `sitemap.xml` to go live. Those registration changes are in `_registration/` as the original Codex diffs, for reference only.

## Unfinished or unverified

- No citation in these pages has been fact-checked by a human or a second model yet. Check every PMID, number and trial name against the source.
- Pages 8–10 (magnesium and BPC-157) have `<title>` tags without the ` | Supplement Intelligence` suffix the other pages use. Check whether `decorate()` in `worker.js` adds it.
- `/peptides/bpc-157` needs a new `PEPTIDE_GUIDES` route in `worker.js`; no peptides section exists on the live site yet.
- The same drafts are waiting as three ChatGPT Codex tasks that John has not turned into PRs yet (batch 1 = pages 1–3, batch 2 = pages 4–7, batch 3 = pages 8–10). If a PR is created from those, it should carry the reviewed versions.
- Writing rules: no dosing advice, A/B/C evidence grades, partner links disclosed. Flag anything that reads as personal medical or dosing advice.
