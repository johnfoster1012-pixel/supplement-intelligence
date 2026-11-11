/**
 * Supplement Intelligence Worker v10 — verification-first rebuild.
 *
 * Canonical surfaces are Worker-rendered product pages and verified ingredient
 * evidence pages. Historical study/database routes are redirected away from
 * withdrawn data. The root homepage is price-free and Worker-rendered.
 */
const CONTENT_BRANCH_NAME = (typeof CONTENT_BRANCH !== 'undefined' && CONTENT_BRANCH) ? CONTENT_BRANCH : 'main';
const IS_PREVIEW = CONTENT_BRANCH_NAME !== 'main';
const VERSION = 'Supplement Intelligence v11.10';
const SITE_ORIGIN = 'https://supplement-intelligence.com';
// CONTENT_REV is the commit SHA the deploy workflow passes in (--var). Content is
// read from that exact commit, so a deploy can never pick up an older copy of a
// file from GitHub's or Cloudflare's caches. Without it (manual deploys) content
// is read from the branch tip.
const CONTENT_REVISION = (typeof CONTENT_REV !== 'undefined' && CONTENT_REV) ? CONTENT_REV : '';
// CONTENT_BASE (dev-only var) lets wrangler dev serve content from a local file server
// before the branch is pushed.
const GITHUB_RAW_BASE = (typeof CONTENT_BASE !== 'undefined' && CONTENT_BASE)
  ? CONTENT_BASE
  : `https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/${CONTENT_REVISION || CONTENT_BRANCH_NAME}/`;
// Cache key for upstream content. It must be a deploy-time constant: Date.now()
// is 0 while a Worker's global scope runs, so a timestamp here never changed and
// Cloudflare kept serving the previous deployment's files for up to an hour.
const CONTENT_CACHE_NAMESPACE = CONTENT_REVISION || VERSION.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

function contentUrl(path) {
  const separator = path.includes('?') ? '&' : '?';
  return GITHUB_RAW_BASE + path + separator + 'si_rev=' + CONTENT_CACHE_NAMESPACE;
}

const VALID_INGREDIENT_SLUGS = new Set([
  'alpha-lipoic-acid',
  'ashwagandha',
  'berberine',
  'caffeine',
  'coenzyme-q10',
  'collagen-peptides',
  'creatine-monohydrate',
  'curcumin',
  'echinacea',
  'glucosamine',
  'glutathione',
  'l-arginine',
  'l-citrulline',
  'l-theanine',
  'magnesium',
  'milk-thistle',
  'msm',
  'omega-3',
  'panax-ginseng',
  'probiotics',
  'resveratrol',
  'senna',
  'valerian',
  'vitamin-c',
  'vitamin-d',
  'zinc',
  'dandelion',
  'hibiscus',
  'horsetail',
  'lemon-balm',
  'moringa',
  'nopal',
  'spirulina',
  'uva-ursi'
]);

const VALID_PRODUCT_SLUGS = new Set([
  'collagen','d-fenz-kids','genius-shake-kids','lattekaffe','nourish-plus','performance-plus',
  's-balance','smartbiotics-kids','v-asculax','v-control','v-curcumax','v-daily','v-fortyflora','v-glutation',
  'v-itadol','v-italay','v-italboost','v-itaren','v-lovkafe','v-neurokafe','v-nitro','v-nrgy','v-omega3',
  'v-organex','v-tedetox','v-thermokafe','vitalpro','v-glutation-plus','v-daily-sachet','v-harmony','v-prime'
]);

// Root hub URLs (/:slug/) 301 to the canonical Worker product page. Known slugs only —
// everything else passes through to origin untouched.
const HUB_REDIRECTS = (() => {
  const m = new Map();
  for (const slug of VALID_PRODUCT_SLUGS) m.set(slug, `/products/${slug}`);
  m.set('nourish-plus-kids', '/products/nourish-plus'); // orphan — no matching store product
  return m;
})();

// Retired articles (fabricated citations) — server-side 301s matching the Phase 3 stub targets.
const ARTICLE_REDIRECTS = (() => {
  const m = new Map();
  for (const slug of VALID_PRODUCT_SLUGS) m.set(`${slug}-benefits`, `/products/${slug}`);
  m.set('nourish-plus-kids-benefits', '/products/nourish-plus');
  m.set('lions-mane-benefits', '/products/lattekaffe');
  m.set('v-neurokafe-vs-coffee', '/products/v-neurokafe');
  for (const slug of ['bacopa-memory','best-nootropic-work','best-supplement-students','complete-guide',
                      'dosage-side-effects','l-theanine-focus','l-theanine-vs-caffeine','top-5-ingredients']) {
    m.set(slug, '/products');
  }
  return m;
})();

// Retired ingredient hubs — rebuilt with verified citations in batch 2.
const INGREDIENT_REDIRECTS = new Map([
  ['omega-3-fatty-acids', '/ingredients/omega-3'],
  ['marine-collagen-peptides', '/ingredients/collagen-peptides'],
  ['bacopa-monnieri', '/ingredients']
]);

// GLP-1 guides: static HTML in glp-1/, keyed by URL slug ('' is the hub at /glp-1).
// `reviewed` drives the visible "Last reviewed" line and the structured data.
const GLP1_GUIDES = new Map([
  ['', { file: 'glp-1/index.html', name: 'Supplements on GLP-1 drugs', reviewed: '2026-11-10' }],
  ['berberine-vs-ozempic', { file: 'glp-1/berberine-vs-ozempic.html', name: 'Berberine vs Ozempic', reviewed: '2026-11-10' }],
  ['semaglutide-with-b12', { file: 'glp-1/semaglutide-with-b12.html', name: 'Semaglutide with B12', reviewed: '2026-11-10' }],
]);

// Guides to point to from an ingredient page: slug -> [[label, path], ...].
const INGREDIENT_GUIDE_LINKS = new Map([
  ['berberine', [['Berberine vs Ozempic', '/glp-1/berberine-vs-ozempic']]],
  ['creatine-monohydrate', [['Supplements on GLP-1 drugs', '/glp-1']]],
  ['magnesium', [['Supplements on GLP-1 drugs', '/glp-1']]],
]);

// Retired /pages/* articles that still earn search impressions: 301 to the
// closest current page instead of 410, so their rankings carry over.
const LEGACY_PAGE_REDIRECTS = new Map([
  ['v-daily-all-in-one-nutrition-adults', '/products/v-daily'],
]);

// Retired study-database pages (fabricated topics).
const DATABASE_REDIRECTS = new Map([
  ['berberine-studies', '/ingredients/berberine'],
  ['ashwagandha-studies', '/ingredients/ashwagandha'],
  ['nac-studies', '/references'],
]);

// Same mark as the ChatGPT plugin icon, so the brand matches across surfaces.
const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="Supplement Intelligence"><rect width="128" height="128" rx="24" fill="#1F6FEB"/><path d="M33 37h62v12H33zM33 58h44v12H33zM33 79h62v12H33z" fill="#ffffff" opacity="0.96"/><circle cx="88" cy="64" r="10" fill="#ffffff"/></svg>';

// Shared header, footer and palette for every page that is not built from
// product-template.html, so the whole site reads as one design.
const CHROME_CSS = `
body{max-width:none!important;margin:0!important;padding:0!important;font-family:Georgia,'Times New Roman',serif!important;background:#faf8f5;color:#2a2a2a;line-height:1.7}
h1,h2,h3{color:#1a3d2e;line-height:1.25}
a{color:#a8532f}
.si-main{max-width:900px;margin:0 auto;padding:28px 24px 48px}
.si-main.si-wide{max-width:1040px}
.si-main .box,.si-main .card,.si-main .notice,.si-main article{background:#fff}
.si-header{background:#1a3d2e;border-bottom:4px solid #c4704a}
.si-header .si-inner{max-width:1140px;margin:0 auto;padding:14px 24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 28px}
.si-logo{color:#fff;font-size:1.5rem;font-weight:700;text-decoration:none;padding:6px 0}
.si-logo span{color:#e8a082}
.si-header nav{display:flex;flex-wrap:wrap;gap:0 24px}
.si-header nav a{color:rgba(255,255,255,.88);text-decoration:none;font-size:.95rem;padding:8px 0}
.si-header nav a:hover{color:#fff;text-decoration:underline}
.si-meta{color:#555;font-size:.92rem;margin-top:-6px}
.si-verdict{background:#fff;border:1px solid #e5e7eb;border-left:5px solid #c4704a;border-radius:0 12px 12px 0;padding:16px 20px;margin:18px 0}
.si-verdict p{margin:6px 0}
.si-table-wrap{overflow-x:auto;margin:18px 0}
.si-main table{border-collapse:collapse;width:100%;background:#fff;font-size:.95rem}
.si-main th,.si-main td{border:1px solid #e5e7eb;padding:10px 12px;text-align:left;vertical-align:top}
.si-main th{background:#e8f0ec;color:#1a3d2e}
.si-sources li{margin-bottom:8px}
.si-main details{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin:10px 0}
.si-main summary{font-weight:700;color:#1a3d2e;cursor:pointer}
.si-footer{background:#1a3d2e;color:rgba(255,255,255,.78);text-align:center;padding:32px 24px;font-size:.9rem}
.si-footer nav{display:flex;flex-wrap:wrap;justify-content:center;gap:0 22px;margin-bottom:12px}
.si-footer a{color:#e8a082;text-decoration:none;padding:8px 0;display:inline-block}
.si-footer a:hover{text-decoration:underline}
.si-footer p{margin:6px auto;max-width:720px}
`;

const SITE_HEADER = '<header class="si-header"><div class="si-inner"><a class="si-logo" href="/">Supplement<span>Intelligence</span></a><nav aria-label="Main"><a href="/glp-1">GLP-1</a><a href="/ingredients">Ingredient evidence</a><a href="/products">Products</a><a href="/references">Research status</a><a href="/about">About</a></nav></div></header>';

const SITE_FOOTER = '<footer class="si-footer"><nav aria-label="Footer"><a href="/glp-1">GLP-1 guides</a><a href="/ingredients">Ingredient evidence</a><a href="/products">Products</a><a href="/references">Research status</a><a href="/about">About</a><a href="/support">Support</a><a href="/disclaimer">Disclaimer</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/api/v1">API</a></nav><p>Supplement Intelligence may earn referral credit from some product links. Compensation does not determine evidence status.</p><p>For informational purposes only; not individualized medical advice.</p></footer>';

let cache = { template: null, productsData: null, ingredientData: null, ts: 0 };
const CACHE_TTL = 3600000;

addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));

async function handleRequest(request) {
  const url = new URL(request.url);

  // One canonical host: www -> apex, same path and query.
  if (url.hostname === 'www.supplement-intelligence.com') {
    return permanentRedirect(SITE_ORIGIN + url.pathname + url.search);
  }

  // Routes are matched on a lower-case path with no trailing slash.
  const path = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const response = await route(request, url, path);

  // A page reached through a non-canonical spelling (/Ingredients/Berberine/,
  // /about/) redirects to the canonical URL instead of serving a duplicate.
  // Redirects and errors pass through unchanged, so there is never a second hop.
  if (response.status === 200 && url.pathname !== path && !path.startsWith('/api/') && path !== '/bingsiteauth.xml') {
    return redirect(url, path + url.search);
  }
  return response;
}

async function route(request, url, path) {
  if (path === '/llm.txt') return proxyRawText('llm.txt', 'text/plain; charset=utf-8');
  if (path === '/llms.txt') return proxyRawText('llms.txt', 'text/plain; charset=utf-8');
  if (path === '/robots.txt') return proxyRawText('robots.txt', 'text/plain; charset=utf-8');
  if (path === '/sitemap.xml') return proxyRawText('sitemap.xml', 'application/xml; charset=utf-8');
  if (path === '/openapi.json') return proxyRawText('openapi.json', 'application/json; charset=utf-8');
  if (path === '/bingsiteauth.xml') return proxyRawText('BingSiteAuth.xml', 'application/xml; charset=utf-8');
  if (path === '/favicon.svg' || path === '/favicon.ico') {
    return new Response(FAVICON_SVG, { status: 200, headers: { ...baseHeaders('image/svg+xml'), 'Cache-Control': 'public, max-age=604800' } });
  }
  // Retired with the old site: the feed and humans.txt described withdrawn
  // articles and an author persona; /pages/* were those articles.
  const legacyPage = path.match(/^\/pages\/([a-z0-9-]+?)(\.html)?$/);
  if (legacyPage && LEGACY_PAGE_REDIRECTS.has(legacyPage[1])) return redirect(url, LEGACY_PAGE_REDIRECTS.get(legacyPage[1]));
  if (path === '/feed.xml' || path === '/humans.txt' || path.startsWith('/pages/')) return gone();

  if (request.method === 'OPTIONS' && path.startsWith('/api/v1')) return apiOptions();
  if (path === '/api/v1') return handleApiIndex(request);
  if (path === '/api/v1/products') return handleApiProducts(request);
  if (path === '/api/v1/ingredients') return handleApiIngredients(request);
  if (path === '/api/v1/search') return handleApiSearch(request, url);

  const apiProductMatch = path.match(/^\/api\/v1\/products\/([a-z0-9-]+)$/);
  if (apiProductMatch) return handleApiProduct(request, apiProductMatch[1]);

  const apiIngredientMatch = path.match(/^\/api\/v1\/ingredients\/([a-z0-9-]+)$/);
  if (apiIngredientMatch) return handleApiIngredient(request, apiIngredientMatch[1]);

  if (path === '/') return handleHome();
  if (path === '/products') return handleProductsIndex();
  if (path === '/formulary') return redirect(url, '/products');
  if (path === '/articles') return proxyHtml('articles/index.html', { path });
  if (path === '/research') return redirect(url, '/articles');
  if (path === '/ingredients') return proxyHtml('ingredients/index.html', { path, breadcrumbs: [['Ingredients', '/ingredients']] });
  if (path === '/database') return redirect(url, '/references');
  if (path === '/about.html') return redirect(url, '/about');
  if (path === '/about') return proxyHtml('site/about.html', { path: '/about' });
  if (path === '/references.html') return redirect(url, '/references');
  if (path === '/references') return proxyHtml('site/references.html', { path: '/references' });
  if (path === '/disclaimer.html') return redirect(url, '/disclaimer');
  if (path === '/disclaimer') return proxyHtml('site/disclaimer.html', { path: '/disclaimer' });
  if (path === '/privacy.html') return redirect(url, '/privacy');
  if (path === '/privacy') return proxyHtml('site/privacy.html', { path: '/privacy' });
  if (path === '/terms.html') return redirect(url, '/terms');
  if (path === '/terms') return proxyHtml('site/terms.html', { path: '/terms' });
  if (path === '/support.html') return redirect(url, '/support');
  if (path === '/support') return proxyHtml('site/support.html', { path: '/support' });

  const guideMatch = path.match(/^\/glp-1(?:\/([a-z0-9-]+))?$/);
  if (guideMatch) {
    const guide = GLP1_GUIDES.get(guideMatch[1] || '');
    return guide ? handleGuide(path, guide) : notFound('Guide Not Found');
  }

  const productMatch = path.match(/^\/products\/([a-z0-9-]+)$/);
  if (productMatch) return handleProduct(url, productMatch[1]);

  const articleMatch = path.match(/^\/articles\/([a-z0-9-]+?)(\.html)?$/);
  if (articleMatch) {
    const target = ARTICLE_REDIRECTS.get(articleMatch[1]);
    return target ? redirect(url, target) : notFound('Article Not Found');
  }

  const ingredientMatch = path.match(/^\/ingredients\/([a-z0-9-]+)$/);
  if (ingredientMatch) {
    const slug = ingredientMatch[1];
    if (VALID_INGREDIENT_SLUGS.has(slug)) return handleIngredientPage(slug);
    const target = INGREDIENT_REDIRECTS.get(slug);
    return target ? redirect(url, target) : notFound('Ingredient Not Found');
  }

  const databaseMatch = path.match(/^\/database\/([a-z0-9-]+)$/);
  if (databaseMatch) {
    const target = DATABASE_REDIRECTS.get(databaseMatch[1]);
    return target ? redirect(url, target) : notFound('Study Database Page Not Found');
  }

  // Root hub slugs: 301 to the canonical product page. Known slugs ONLY.
  const hubMatch = path.match(/^\/([a-z0-9-]+)$/);
  if (hubMatch) {
    const target = HUB_REDIRECTS.get(hubMatch[1]);
    if (target) return redirect(url, target);
  }

  // Anything unmatched is checked against the legacy origin (the old Pages
  // project). Real files there (verification keys, images) still pass through,
  // but its catch-all HTML is the retired homepage, so HTML becomes a real 404.
  if (IS_PREVIEW) {
    return new Response(`PASSTHROUGH -> origin (${url.pathname})`, { status: 200, headers: textHeaders({ 'X-Passthrough': '1' }) });
  }
  let originResponse;
  try {
    originResponse = await fetch(request);
  } catch (_) {
    return notFound('Page Not Found');
  }
  const originType = originResponse.headers.get('Content-Type') || '';
  if (originResponse.status === 200 && originType.includes('text/html')) return notFound('Page Not Found');
  return originResponse;
}

function permanentRedirect(location) {
  return new Response(null, {
    status: 301,
    headers: { 'Location': location, 'Cache-Control': 'public, max-age=3600', 'X-Powered-By': VERSION }
  });
}

function redirect(url, targetPath) {
  return new Response(null, {
    status: 301,
    headers: {
      'Location': url.origin + targetPath,
      'Cache-Control': 'public, max-age=3600',
      'X-Powered-By': VERSION,
    }
  });
}

async function handleProduct(url, slug) {
  if (slug === 'nourish-plus-kids') return redirect(url, '/products/nourish-plus');
  if (!VALID_PRODUCT_SLUGS.has(slug)) return notFound('Product Not Found');

  const [template, productsData] = await Promise.all([getTemplate(), getProductsData()]);
  if (!template || !productsData) {
    return new Response('Unable to load product page resources', { status: 503, headers: textHeaders() });
  }
  const product = productsData.products[slug];
  if (!product) return notFound('Product data not found');

  const html = renderProductPage(template, product, productsData);
  return new Response(html, {
    status: 200,
    headers: htmlHeaders({ 'X-Product': slug, 'X-Powered-By': VERSION })
  });
}

async function handleHome() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Supplement Intelligence | Evidence-Based Ingredient & Supplement Research</title>
<meta name="description" content="Verification-first supplement research with current product formulations, 34 reviewed ingredient evidence pages, safety context, and primary-source citations.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://supplement-intelligence.com/">
<style>
a{text-decoration:none}a:hover{text-decoration:underline}
.hero{padding:12px 0 18px}.hero h1{font-size:2.35rem;line-height:1.15;margin:0 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:20px}
.pill{display:inline-block;background:#fff;border:1px solid #d7dde5;border-radius:999px;padding:8px 14px;margin:4px 6px 4px 0;font-size:.95rem}
</style>
</head>
<body>
<section class="hero">
<h1>Supplement research built around verification, not marketing claims</h1>
<p>Supplement Intelligence separates current product-formulation facts from ingredient-level human evidence and from finished-product efficacy. The database currently tracks 31 products and 34 reviewed ingredient evidence pages.</p>
<p><a href="/ingredients"><strong>Browse ingredient evidence →</strong></a> &nbsp; <a href="/products">Browse product formulations →</a></p>
</section>
<section class="grid">
<div class="card"><h2>Supplements and GLP-1 drugs</h2><p>What trials show, and do not show, about creatine, protein, fiber, magnesium and biotin for people taking semaglutide or tirzepatide.</p><p><a href="/glp-1">Read the GLP-1 guide</a> · <a href="/glp-1/semaglutide-with-b12">Semaglutide with B12</a> · <a href="/glp-1/berberine-vs-ozempic">Berberine vs Ozempic</a></p></div>
<div class="card"><h2>Reviewed ingredient evidence</h2><p>Evidence summaries cover studied context, safety, source quality, and whether current products actually match the studied form or dose.</p><p><a href="/ingredients">View all 34 ingredient pages</a></p></div>
<div class="card"><h2>Current product formulations</h2><p>Manufacturer pages are used for formulation facts only. Finished-product efficacy remains Under Review unless explicitly adjudicated.</p><p><a href="/products">View 31 product records</a></p></div>
<div class="card"><h2>Research methodology</h2><p>Historical citation sets that did not meet the current standard were withdrawn. The current method prioritizes primary research and authoritative government sources.</p><p><a href="/references">Read research status</a></p></div>
</section>
<h2>Core evidence topics</h2>
<p><a class="pill" href="/ingredients/creatine-monohydrate">Creatine</a><a class="pill" href="/ingredients/omega-3">Omega-3</a><a class="pill" href="/ingredients/magnesium">Magnesium</a><a class="pill" href="/ingredients/vitamin-d">Vitamin D</a><a class="pill" href="/ingredients/berberine">Berberine</a><a class="pill" href="/ingredients/ashwagandha">Ashwagandha</a><a class="pill" href="/ingredients/curcumin">Curcumin</a><a class="pill" href="/ingredients/caffeine">Caffeine</a></p>
</body></html>`;
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Supplement Intelligence', url: SITE_ORIGIN + '/',
    description: 'Verification-first supplement formulation and ingredient evidence research.',
    publisher: { '@type': 'Organization', name: 'Supplement Intelligence', url: SITE_ORIGIN + '/', logo: SITE_ORIGIN + '/favicon.svg' }
  }];
  return new Response(decorate(html, { path: '/', wide: true, jsonLd }), { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

async function handleProductsIndex() {
  const productsData = await getProductsData();
  if (!productsData) return new Response('Unable to load products', { status: 503, headers: textHeaders() });
  const html = renderProductsIndex(productsData);
  return new Response(html, { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

// Fetches a repo file as text. Returns { body } on success or { error: Response }.
async function fetchRaw(path) {
  try {
    const res = await fetch(contentUrl(path), { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/11.0' }, cf: { cacheTtl: 3600 } });
    if (!res.ok) return { error: new Response('Temporarily unavailable', { status: 503, headers: textHeaders({ 'Cache-Control': 'no-store' }) }) };
    return { body: normalizeText(await res.text()) };
  } catch (err) {
    return { error: new Response('Error fetching content: ' + err.message, { status: 500, headers: textHeaders({ 'Cache-Control': 'no-store' }) }) };
  }
}

async function proxyRawText(path, contentType) {
  const raw = await fetchRaw(path);
  if (raw.error) return raw.error;
  return new Response(raw.body, { status: 200, headers: baseHeaders(contentType) });
}

// Static HTML from the repo, wrapped in the shared header/footer and metadata.
async function proxyHtml(path, options) {
  const raw = await fetchRaw(path);
  if (raw.error) return raw.error;
  return new Response(decorate(raw.body, options), { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

// A guide page: static HTML plus the shared chrome, review date and schema.
async function handleGuide(path, guide) {
  const raw = await fetchRaw(guide.file);
  if (raw.error) return raw.error;
  const isHub = path === '/glp-1';
  const breadcrumbs = [['GLP-1', '/glp-1']];
  if (!isHub) breadcrumbs.push([guide.name, path]);
  const description = decodeEntities((raw.body.match(/<meta name="description" content="([^"]*)">/i) || [])[1] || '');
  const options = {
    path, ogType: 'article', breadcrumbs,
    afterH1: `<p class="si-meta">Last reviewed ${escapeHtml(formatLongDate(guide.reviewed))} · <a href="/references">How evidence is reviewed</a></p>`,
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'MedicalWebPage',
      name: guide.name, description, url: SITE_ORIGIN + path,
      lastReviewed: guide.reviewed, dateModified: guide.reviewed,
      publisher: { '@type': 'Organization', name: 'Supplement Intelligence', url: SITE_ORIGIN + '/' }
    }]
  };
  return new Response(decorate(raw.body, options), { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

async function handleIngredientPage(slug) {
  const [raw, data] = await Promise.all([fetchRaw(`ingredients/${slug}.html`), getIngredientData()]);
  if (raw.error) return raw.error;
  const x = data && data.ingredients ? data.ingredients[slug] : null;
  const path = '/ingredients/' + slug;
  const options = { path, ogType: 'article', breadcrumbs: [['Ingredients', '/ingredients']] };
  if (x) {
    options.breadcrumbs.push([x.name, path]);
    // Expanded pages can set their own search title and description in the data record.
    options.title = x.page_title || `${x.name} Evidence Review: Uses, Safety & Sources | Supplement Intelligence`;
    options.description = x.page_description || truncateText(`${x.name} evidence review: ${x.posture}`, 158);
    const reviewed = x.last_reviewed_at || data.generated_at || null;
    if (reviewed) {
      options.afterH1 = `<p class="si-meta">Last reviewed ${escapeHtml(formatLongDate(reviewed))} · <a href="/references">How evidence is reviewed</a></p>`;
    }
    const guideLinks = INGREDIENT_GUIDE_LINKS.get(slug) || [];
    if (guideLinks.length) {
      options.afterH1 = (options.afterH1 || '') + '<p class="si-meta">Related guide: '
        + guideLinks.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join(' · ') + '</p>';
    }
    const page = {
      '@context': 'https://schema.org', '@type': 'MedicalWebPage',
      name: `${x.name} evidence review`, description: x.posture, url: SITE_ORIGIN + path,
      about: { '@type': 'Thing', name: x.name },
      publisher: { '@type': 'Organization', name: 'Supplement Intelligence', url: SITE_ORIGIN + '/' }
    };
    if (reviewed) { page.lastReviewed = reviewed; page.dateModified = reviewed; }
    options.jsonLd = [page];
  }
  return new Response(decorate(raw.body, options), { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

// Adds the shared chrome and head metadata to a complete HTML document.
// options: path (canonical path), title, description, ogType, wide,
// breadcrumbs ([[name, path], ...] below Home), jsonLd (array), afterH1, noindex.
function decorate(html, options = {}) {
  let out = html;
  if (options.title) out = out.replace(/<title>[^<]*<\/title>/i, () => `<title>${escapeHtml(options.title)}</title>`);
  if (options.description) {
    out = out.replace(/<meta name="description" content="[^"]*">/i, () => `<meta name="description" content="${escapeHtml(options.description)}">`);
  }
  const title = decodeEntities((out.match(/<title>([^<]*)<\/title>/i) || [])[1] || 'Supplement Intelligence');
  const description = decodeEntities((out.match(/<meta name="description" content="([^"]*)">/i) || [])[1] || '');
  const pageUrl = SITE_ORIGIN + (options.path || '/');

  let head = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
  if (options.noindex) head += '<meta name="robots" content="noindex">';
  if (!options.noindex && !/property="og:title"/.test(out)) {
    head += `<meta property="og:title" content="${escapeHtml(title)}">`
      + (description ? `<meta property="og:description" content="${escapeHtml(description)}">` : '')
      + `<meta property="og:type" content="${options.ogType || 'website'}">`
      + `<meta property="og:url" content="${escapeHtml(pageUrl)}">`
      + '<meta property="og:site_name" content="Supplement Intelligence"><meta name="twitter:card" content="summary">';
  }
  const jsonLd = (options.jsonLd || []).slice();
  if (options.breadcrumbs && options.breadcrumbs.length) jsonLd.push(breadcrumbSchema(options.breadcrumbs));
  for (const item of jsonLd) head += `<script type="application/ld+json">${safeJson(item)}</script>`;
  head += `<style>${CHROME_CSS}</style>`;

  out = out.replace(/<\/head>/i, () => head + '</head>');
  out = out.replace(/<body[^>]*>/i, m => `${m}${SITE_HEADER}<main class="si-main${options.wide ? ' si-wide' : ''}">`);
  out = out.replace(/<\/body>/i, () => `</main>${SITE_FOOTER}</body>`);
  if (options.afterH1) out = out.replace(/<\/h1>/i, m => m + options.afterH1);
  return out;
}

function breadcrumbSchema(crumbs) {
  const items = [['Home', '/']].concat(crumbs);
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_ORIGIN + path }))
  };
}

// JSON for an inline <script>: "<" is escaped so content can never close the tag.
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function decodeEntities(text) {
  return String(text).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function formatLongDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  return isNaN(date.getTime()) ? String(dateStr) : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function getTemplate() {
  const now = Date.now();
  if (cache.template && (now - cache.ts) < CACHE_TTL) return cache.template;
  try {
    const res = await fetch(contentUrl('product-template.html'), { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/11.0' }, cf: { cacheTtl: 3600 } });
    if (res.ok) {
      cache.template = normalizeText(await res.text());
      cache.ts = now;
      return cache.template;
    }
  } catch (_) {}
  return cache.template;
}

async function getProductsData() {
  const now = Date.now();
  if (cache.productsData && (now - cache.ts) < CACHE_TTL) return cache.productsData;
  try {
    const res = await fetch(contentUrl('products-data.json'), { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/11.0' }, cf: { cacheTtl: 3600 } });
    if (res.ok) {
      const json = await res.json();
      cache.productsData = deepNormalize(json);
      cache.ts = now;
      return cache.productsData;
    }
  } catch (_) {}
  return cache.productsData;
}

async function getIngredientData() {
  const now = Date.now();
  if (cache.ingredientData && (now - cache.ts) < CACHE_TTL) return cache.ingredientData;
  try {
    const res = await fetch(contentUrl('ingredient-evidence.json'), { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/11.0' }, cf: { cacheTtl: 3600 } });
    if (res.ok) {
      const json = await res.json();
      cache.ingredientData = deepNormalize(json);
      cache.ts = now;
      return cache.ingredientData;
    }
  } catch (_) {}
  return cache.ingredientData;
}

function apiHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300',
    'X-Powered-By': VERSION,
    ...extra,
  };
}

function apiOptions() {
  return new Response(null, { status: 204, headers: apiHeaders() });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: apiHeaders() });
}

function apiMethodAllowed(request) {
  return request.method === 'GET' || request.method === 'HEAD';
}

async function handleApiIndex(request) {
  if (!apiMethodAllowed(request)) return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const [productsData, ingredientData] = await Promise.all([getProductsData(), getIngredientData()]);
  return jsonResponse({
    name: 'Supplement Intelligence API',
    version: 'v1',
    status: 'verification-first',
    products: productsData ? Object.keys(productsData.products || {}).length : null,
    ingredients: ingredientData ? Object.keys(ingredientData.ingredients || {}).length : null,
    endpoints: {
      products: '/api/v1/products',
      product: '/api/v1/products/{slug}',
      ingredients: '/api/v1/ingredients',
      ingredient: '/api/v1/ingredients/{slug}',
      search: '/api/v1/search?q={query}',
      openapi: '/openapi.json'
    },
    interpretation: 'Ingredient-level evidence is not automatically finished-product evidence.'
  });
}

async function handleApiProducts(request) {
  if (!apiMethodAllowed(request)) return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const data = await getProductsData();
  if (!data) return jsonResponse({ error: 'Product data unavailable' }, 503);
  const products = Object.values(data.products || {}).map(p => ({
    slug: p.slug,
    name: p.name,
    canonical_url: 'https://supplement-intelligence.com/products/' + p.slug,
    formulation_status: p.formulationStatus || null,
    formulation_source: p.formulationSource || null,
    evidence_status: p.evidenceGrade || 'Under Review',
    ingredient_evidence_links: p.ingredientEvidenceLinks || []
  }));
  return jsonResponse({ count: products.length, products });
}

async function handleApiProduct(request, slug) {
  if (!apiMethodAllowed(request)) return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const data = await getProductsData();
  const p = data && data.products ? data.products[slug] : null;
  if (!p) return jsonResponse({ error: 'Product not found' }, 404);
  return jsonResponse({
    slug: p.slug,
    name: p.name,
    canonical_url: 'https://supplement-intelligence.com/products/' + p.slug,
    ingredients: p.ingredients || null,
    formulation_status: p.formulationStatus || null,
    formulation_source: p.formulationSource || null,
    evidence_status: p.evidenceGrade || 'Under Review',
    evidence_note: p.evidenceGradeText || null,
    ingredient_evidence_links: p.ingredientEvidenceLinks || [],
    commercial_disclosure: 'Supplement Intelligence may earn referral credit from some product links.'
  });
}

async function handleApiIngredients(request) {
  if (!apiMethodAllowed(request)) return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const data = await getIngredientData();
  if (!data) return jsonResponse({ error: 'Ingredient evidence unavailable' }, 503);
  const ingredients = Object.entries(data.ingredients || {}).map(([slug, x]) => ({
    slug,
    name: x.name,
    canonical_url: 'https://supplement-intelligence.com/ingredients/' + slug,
    evidence_posture: x.posture,
    related_products: x.products || []
  }));
  return jsonResponse({ count: ingredients.length, ingredients });
}

async function handleApiSearch(request, url) {
  if (!apiMethodAllowed(request)) return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) return jsonResponse({ error: 'Query must contain at least 2 characters' }, 400);

  const [productsData, ingredientData] = await Promise.all([getProductsData(), getIngredientData()]);
  const productResults = Object.values((productsData && productsData.products) || {})
    .filter(p => [p.name, p.slug, p.ingredients].some(v => String(v || '').toLowerCase().includes(q)))
    .slice(0, 20)
    .map(p => ({
      type: 'product',
      slug: p.slug,
      name: p.name,
      canonical_url: 'https://supplement-intelligence.com/products/' + p.slug,
      formulation_status: p.formulationStatus || null,
      evidence_status: p.evidenceGrade || 'Under Review'
    }));

  const ingredientResults = Object.entries((ingredientData && ingredientData.ingredients) || {})
    .filter(([slug, x]) => [slug, x.name, x.posture, x.summary].some(v => String(v || '').toLowerCase().includes(q)))
    .slice(0, 20)
    .map(([slug, x]) => ({
      type: 'ingredient',
      slug,
      name: x.name,
      canonical_url: 'https://supplement-intelligence.com/ingredients/' + slug,
      evidence_posture: x.posture
    }));

  return jsonResponse({
    query: q,
    count: productResults.length + ingredientResults.length,
    results: [...ingredientResults, ...productResults]
  });
}

async function handleApiIngredient(request, slug) {
  if (!apiMethodAllowed(request)) return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const data = await getIngredientData();
  const x = data && data.ingredients ? data.ingredients[slug] : null;
  if (!x) return jsonResponse({ error: 'Ingredient not found' }, 404);
  return jsonResponse({
    slug,
    canonical_url: 'https://supplement-intelligence.com/ingredients/' + slug,
    ...x,
    interpretation: 'Ingredient-level evidence is not proof that a finished product has the same effect.'
  });
}

function renderProductPage(template, product, productsData) {
  let html = template;
  const citations = product.citations || [];
  const grade = product.evidenceGrade || 'Under Review';
  const underReview = String(grade).toLowerCase() === 'under review';
  const formulationVerified = String(product.formulationStatus || '').toLowerCase().startsWith('verified against current manufacturer');
  const publicIngredients = formulationVerified ? (product.ingredients || '') : 'Formulation re-verification in progress.';
  const publicTldr = underReview ? 'This product record is undergoing current-label and evidence re-verification. Ingredient-specific efficacy claims are not being asserted until that review is complete.' : (product.tldr || '');
  // Each product gets its own search description (name + label ingredients)
  // rather than the shared under-review sentence, which duplicated across all pages.
  const metaDescription = formulationVerified
    ? `${product.name} ingredients and evidence status. Label lists: ${product.ingredients}`
    : publicTldr;
  const faqs = product.faqs || [];
  const related = (product.relatedProducts && product.relatedProducts.length)
    ? product.relatedProducts
    : findRelatedProducts(product, productsData);
  // Sections with nothing to show are removed along with their table-of-contents entries.
  if (!faqs.length) html = stripSection(html, 'FAQS');
  if (!related.length) html = stripSection(html, 'RELATED');
  const publicResearch = underReview ? 'Evidence review in progress. Verified references will be republished only after the current formulation and study-to-claim mapping are confirmed.' : (product.research || '');

  // Grades are void until re-derived from verified ingredients; citation counts are
  // honest (most are 0 pending verification) — render review-state text, not "0 Citations".
  if (citations.length === 0) {
    html = html.replace(/\{\{TOTAL_CITATIONS\}\}\s*Citations/g, 'Citations under review');
    html = html.replace(/\{\{TOTAL_CITATIONS\}\}/g, '—');
  }

  html = html.replace(/\{\{PRODUCT_NAME\}\}/g, escapeHtml(product.name));
  html = html.replace(/\{\{PRODUCT_SLUG\}\}/g, product.slug);
  html = html.replace(/\{\{PRODUCT_CATEGORY\}\}/g, escapeHtml(product.category || 'General'));
  html = html.replace(/\{\{PRODUCT_CATEGORY_DISPLAY\}\}/g, escapeHtml(formatCategory(product.category)));
  html = html.replace(/\{\{PRODUCT_INGREDIENTS\}\}/g, escapeHtml(publicIngredients));
  html = html.replace(/\{\{EVIDENCE_GRADE\}\}/g, escapeHtml(grade));
  html = html.replace(/\{\{TOTAL_CITATIONS\}\}/g, String(product.totalCitations || citations.length));
  html = html.replace(/\{\{LAST_UPDATED\}\}/g, escapeHtml(formatDate(product.lastUpdated)));
  html = html.replace(/\{\{PRODUCT_TLDR\}\}/g, formatParagraphs(publicTldr));
  html = html.replace(/\{\{PRODUCT_TLDR_SHORT\}\}/g, escapeHtml(truncateText(metaDescription, 160)));
  html = html.replace(/\{\{RESEARCH_CONTENT\}\}/g, formatParagraphs(publicResearch));
  html = html.replace(/\{\{MECHANISM\}\}/g, formatParagraphs((product.mechanism || '').replace(/^The mechanism is:\s*/i, '')));
  html = html.replace(/\{\{INGREDIENTS_LIST\}\}/g, formatIngredients(publicIngredients));
  html = html.replace(/\{\{INGREDIENT_EVIDENCE_LINKS\}\}/g, formatIngredientEvidenceLinks(product.ingredientEvidenceLinks || []));
  html = html.replace(/\{\{CITATIONS_LIST\}\}/g, formatCitations(citations));
  html = html.replace(/\{\{FAQS_LIST\}\}/g, formatFaqs(faqs));
  html = html.replace(/\{\{RELATED_PRODUCTS\}\}/g, formatRelatedProducts(related));

  html = normalizeText(html);
  // Per-product affiliate deep link (replaces the template's generic Vital Health link).
  // Done after normalizeText so the exact URL (hyphens/refID) is preserved.
  const shopUrl = product.shopUrl || 'https://vitalhealthglobal.com/products';
  return html.split('https://vitalhealthglobal.com/products').join(shopUrl);
}

function renderProductsIndex(productsData) {
  const products = Object.values(productsData.products || {});
  const grouped = {};
  for (const product of products) {
    const cat = product.category || 'other';
    grouped[cat] = grouped[cat] || [];
    grouped[cat].push(product);
  }
  let groupsHtml = '';
  for (const [category, items] of Object.entries(grouped).sort()) {
    groupsHtml += `<section><h2>${escapeHtml(formatCategory(category))}</h2>`;
    for (const p of items.sort((a,b)=>a.name.localeCompare(b.name))) {
      const citations = p.citations || [];
      const evidence = citations.length
        ? `<strong>Evidence grade:</strong> ${escapeHtml(p.evidenceGrade || 'Under Review')} · <strong>Citations:</strong> ${citations.length}`
        : '<strong>Evidence:</strong> full review in progress';
      groupsHtml += `<article style="border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:14px 0;">
        <h3><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
        <p>${escapeHtml(String(p.formulationStatus || '').toLowerCase().startsWith('verified against current manufacturer') ? 'Current manufacturer formulation checked Oct 2026. Efficacy evidence remains under review.' : 'Formulation and efficacy evidence are under review.')}</p>
        <p>${evidence}</p>
      </article>`;
    }
    groupsHtml += '</section>';
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vital Health Global Products: Ingredients & Evidence Status | Supplement Intelligence</title><meta name="description" content="Current ingredient lists for ${products.length} Vital Health Global products, checked against manufacturer labels, with links to reviewed evidence for each ingredient."><link rel="canonical" href="https://supplement-intelligence.com/products"><style>a{text-decoration:none}a:hover{text-decoration:underline}</style></head><body><p><a href="/">Home</a> / Products</p><h1>All Products</h1><p>Independent product information for the Vital Health Global catalog. Product formulation records are undergoing label re-verification; a full evidence review is in progress.</p>${groupsHtml}</body></html>`;
  return decorate(html, { path: '/products', breadcrumbs: [['Products', '/products']] });
}

function formatParagraphs(text) {
  return normalizeText(text).split(/\n\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n');
}

function formatIngredients(text) {
  const items = normalizeText(text).split(';').map(x => x.trim()).filter(Boolean);
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function formatIngredientEvidenceLinks(items) {
  if (!items.length) {
    return '<p>No verified ingredient evidence page is linked to this product yet.</p>';
  }
  return '<ul>' + items.map(item =>
    '<li><a href="' + escapeHtml(item.url) + '"><strong>' + escapeHtml(item.name) + '</strong></a> — ' +
    escapeHtml(item.posture || 'Evidence summary available.') + '</li>'
  ).join('') + '</ul>';
}

function formatCitations(citations) {
  if (!citations.length) {
    return '<li>Citations have been removed pending verification. A full evidence review is in progress; verified references will be republished once confirmed.</li>';
  }
  return citations.map(c => `<li>${escapeHtml(c.title)} · PMID <a href="https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(c.pmid)}">${escapeHtml(c.pmid)}</a></li>`).join('');
}

function formatFaqs(faqs) {
  return faqs.map(f => `<details><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer)}</p></details>`).join('');
}

function formatRelatedProducts(relatedProducts) {
  return relatedProducts.map(r => `<a class="related-card" href="${escapeHtml(r.url)}"><h4>${escapeHtml(r.name || r.slug)}</h4></a>`).join('');
}

// Up to four other products that share the most reviewed ingredients with this one.
function findRelatedProducts(product, productsData) {
  const own = new Set((product.ingredientEvidenceLinks || []).map(x => x.url));
  if (!own.size || !productsData || !productsData.products) return [];
  return Object.values(productsData.products)
    .filter(p => p.slug !== product.slug)
    .map(p => ({ p, shared: (p.ingredientEvidenceLinks || []).filter(x => own.has(x.url)).length }))
    .filter(x => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.p.name.localeCompare(b.p.name))
    .slice(0, 4)
    .map(x => ({ url: '/products/' + x.p.slug, name: x.p.name, slug: x.p.slug }));
}

// Removes every <!--IF_NAME-->...<!--/IF_NAME--> block from the template.
function stripSection(html, name) {
  return html.replace(new RegExp(`<!--IF_${name}-->[\\s\\S]*?<!--/IF_${name}-->`, 'g'), '');
}

// Mojibake repair, behavior-identical to the v8 chain but written with explicit
// escapes so the source itself can never be re-garbled by copy/paste or re-encoding.
function normalizeText(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\u00e2\u0080\u0094/g, '\u2014').replace(/\u00e2\u0080\u0093/g, '\u2013')
    .replace(/\u00e2\u0080\u0099/g, '\u2019').replace(/\u00e2\u0080\u009c/g, '\u201c').replace(/\u00e2\u0080\u009d/g, '\u201d')
    .replace(/\u00c3\u00b6/g, '\u00f6').replace(/\u00c3\u00b1/g, '\u00f1').replace(/\u00c3\u00a9/g, '\u00e9')
    .replace(/\u00c3\u00bc/g, '\u00fc').replace(/\u00c3-/g, '\u00ed')
    .replace(/\u0080\u0094/g, '\u2014').replace(/\u0080/g, '')
    .replace(/-\u0080\u0094/g, '\u2014').replace(/-\u0080\u0093/g, '\u2013')
    .replace(/\s+/g, m => m.includes('\n') ? m : ' ')
    .trim();
}

function deepNormalize(value) {
  if (Array.isArray(value)) return value.map(deepNormalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k,v] of Object.entries(value)) out[k] = deepNormalize(v);
    return out;
  }
  if (typeof value === 'string') return normalizeText(value);
  return value;
}

function escapeHtml(text) {
  return String(normalizeText(text || ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(text, maxLength) {
  const clean = normalizeText(text || '');
  return clean.length <= maxLength ? clean : clean.slice(0, maxLength).trimEnd() + '…';
}

function formatCategory(cat) {
  return String(cat || 'General').split(/[\/\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' / ');
}

function formatDate(dateStr) {
  if (!dateStr) return '2026';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? String(dateStr) : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function baseHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Strict-Transport-Security': 'max-age=31536000',
  };
}
function htmlHeaders(extra={}) { return { ...baseHeaders('text/html; charset=utf-8'), ...extra }; }
function textHeaders(extra={}) { return { ...baseHeaders('text/plain; charset=utf-8'), ...extra }; }
function notFound(msg) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(msg)} | Supplement Intelligence</title></head><body><h1>Page not found</h1><p>That page does not exist or has been retired. Older articles and study lists were withdrawn when the site moved to verified sources.</p><p><a href="/ingredients"><strong>Browse ingredient evidence →</strong></a></p><p><a href="/products">Browse product formulations →</a></p><p><a href="/">Go to the homepage →</a></p></body></html>`;
  return new Response(decorate(html, { noindex: true }), {
    status: 404,
    headers: htmlHeaders({ 'Cache-Control': 'public, max-age=300', 'X-Powered-By': VERSION })
  });
}
function gone() {
  return new Response('Gone: this resource was retired.', {
    status: 410,
    headers: textHeaders({ 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex', 'X-Powered-By': VERSION })
  });
}
