# Referral link audit

Checked Nov 15, 2026 against `products-data.json` (39 products). Read-only; no data was changed.

## Result

No fixes needed. Every product has a `shopUrl`, and every `shopUrl` carries the owner's referral tag.

| Brand | Products | `shopUrl` format | Tagged |
| --- | --- | --- | --- |
| Vital Health Global | 31 | `vitalhealthglobal.com/products/<slug>?refID=149983` | 31 of 31 |
| Zilara | 6 | `zilara.com/<slug>?site=447135` | 6 of 6 |
| Orygn | 2 | `johnfoster.orygn.co/<slug>` | 2 of 2 |

The 39 untagged brand URLs in the file are `formulationSource` values. They point to the manufacturer's label page as the evidence source and are correctly untagged.

## How clicks are tracked

`worker.js` serves `/go/<product-slug>`. It logs an `affiliate_click` event (product, brand, source page, bot flag; no personal data) and redirects to `shopUrl`. Product pages link through it with `rel="sponsored nofollow noopener"`.

Any new product link on a guide or ingredient page should use `/go/<slug>` so the click is logged and the referral URL stays in one place.

## Open item

The owner also has a Vital Health storefront at `my.vitalhealthglobal.com/jfoster/shop`. He is confirming whether the `?refID=149983` format credits him equally. Do not rewrite Vital Health links until he confirms.

## Note for page work

Static guides are registered by slug in `worker.js` (see the GLP-1 guide map). A new page needs a registry entry there and a `sitemap.xml` entry, so "add a page" is not a pure HTML change.
