# Supplement Intelligence Plugin Release Checklist

Use this checklist for every public plugin/MCP release.

## 1. Source-of-truth data

- [ ] Update `products-data.json` only from current verified manufacturer information.
- [ ] Update `ingredient-evidence.json` only after evidence review.
- [ ] Keep ingredient-level evidence separate from finished-product efficacy.
- [ ] Confirm generated/review dates are correct.
- [ ] Run repository consistency validation.

The MCP build automatically generates its temporary bundled copies from these root files. Do not manually maintain copies under `mcp-server/data/`.

## 2. MCP validation

- [ ] `npm install` succeeds in `mcp-server/`.
- [ ] `npm run typecheck` succeeds.
- [ ] Wrangler dry-run succeeds.
- [ ] MCP validation workflow is green.
- [ ] Tool count and names remain intentional.
- [ ] Read-only/safety annotations remain correct.
- [ ] No user query text or personal health content is added to application telemetry.

## 3. Production MCP deploy

Production endpoint:

`https://mcp.supplement-intelligence.com/mcp`

- [ ] Deploy MCP Worker from `main`.
- [ ] Root endpoint returns HTTP 200.
- [ ] `/health` returns HTTP 200.
- [ ] `/mcp` exists and is not HTTP 404.
- [ ] Protocol smoke test passes.
- [ ] Synonym tests pass.
- [ ] Ingredient freshness/source metadata tests pass.
- [ ] Product freshness metadata tests pass.
- [ ] Reported server version matches the intended release.

## 4. Main website production checks

The Cloudflare deploy workflow must verify:

- [ ] Homepage
- [ ] Products index
- [ ] Ingredients index
- [ ] Representative ingredient pages
- [ ] API index/search/product/ingredient routes
- [ ] OpenAPI document
- [ ] Sitemap / robots / llms
- [ ] `/privacy`
- [ ] `/terms`
- [ ] `/support`

Do not proceed with public submission if any required public route fails.

## 5. Portable plugin package

- [ ] `plugin-package/plugin.json` version is correct.
- [ ] `mcp.json` points to the production MCP endpoint.
- [ ] Skill instructions match current tool behavior.
- [ ] Positive and negative review cases remain valid.
- [ ] Branding asset references resolve.
- [ ] Website, support, privacy, and terms URLs are current.
- [ ] Plugin-package validation workflow is green.
- [ ] Use the ZIP artifact generated from the current `main` commit.

Do not use an older feature-branch ZIP for submission.

## 6. ChatGPT functional tests

Before submission, test in ChatGPT:

- [ ] Ingredient evidence lookup.
- [ ] Product formulation lookup.
- [ ] Ingredient-vs-finished-product evidence distinction.
- [ ] Safety-context question.
- [ ] Browse/list reviewed ingredients.
- [ ] Common synonym lookup.
- [ ] Unrelated request does not invoke Supplement Intelligence.

## 7. OpenAI dashboard items

These require dashboard/user action and are not stored in the repository:

- [ ] Connect the production MCP server.
- [ ] Set authentication to none/public read-only, unless architecture changes.
- [ ] Obtain the exact OpenAI domain-verification challenge token.
- [ ] Store that token as the Cloudflare Worker secret `OPENAI_APPS_CHALLENGE`.
- [ ] Verify the domain.
- [ ] Run/clear the automated plugin and MCP scan.
- [ ] Provide the reviewer-accessible demo video URL.
- [ ] Review public listing metadata.
- [ ] Submit for review.

Never commit the domain-verification token or any secret to Git.

## 8. Release evidence

Record for each release:

- Main commit SHA
- MCP deployment workflow run
- Plugin-package workflow run
- Plugin artifact name and digest
- Data version/date
- Any reviewer/dashboard feedback

## 9. Deferred design work

Favicon/icon refinements are independent of the evidence and MCP architecture. They may be updated later without changing scientific claims.
