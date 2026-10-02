# Cloudflare deployment guide — Supplement Intelligence

## Deployment target

Deploy the current `worker.js` from the reviewed main branch after the verification-cleanup PR is approved.

## Automated deployment

The repository contains a GitHub Actions workflow for Cloudflare Worker deployment. Required Cloudflare credentials should remain stored as GitHub Actions secrets and must never be committed to the repository.

## Manual deployment

If a manual deployment is required:
1. Open Cloudflare Workers & Pages.
2. Select the Supplement Intelligence Worker.
3. Replace the Worker code with the reviewed `worker.js`.
4. Save and deploy.
5. Purge relevant cached pages if stale content remains.

## Post-deployment verification

Check:
- https://supplement-intelligence.com/
- https://supplement-intelligence.com/products
- https://supplement-intelligence.com/ingredients
- https://supplement-intelligence.com/ingredients/creatine-monohydrate
- https://supplement-intelligence.com/ingredients/berberine
- https://supplement-intelligence.com/about
- https://supplement-intelligence.com/references
- https://supplement-intelligence.com/llms.txt
- https://supplement-intelligence.com/sitemap.xml

Confirm:
- the homepage contains no displayed product pricing
- retired database pages do not expose old evidence
- product pages show the verified current formulation while efficacy remains Under Review
- ingredient evidence pages load correctly
- About and Research Status show the current disclosure and verification policy

## Search indexing

After deployment, submit the current `sitemap.xml` in Google Search Console. Request re-crawling for the homepage, products index, ingredient index, and newly published verified ingredient pages as appropriate.

Do not request indexing for retired database URLs.
