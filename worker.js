/**
 * Supplement Intelligence Worker v10 — verification-first rebuild.
 *
 * Canonical surfaces are Worker-rendered product pages and verified ingredient
 * evidence pages. Historical study/database routes are redirected away from
 * withdrawn data. The root homepage is price-free and Worker-rendered.
 */
const CONTENT_BRANCH_NAME = (typeof CONTENT_BRANCH !== 'undefined' && CONTENT_BRANCH) ? CONTENT_BRANCH : 'main';
const IS_PREVIEW = CONTENT_BRANCH_NAME !== 'main';
const VERSION = 'Supplement Intelligence v11.21';
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
  'uva-ursi','fulvic-acid','black-walnut-hull','black-seed-oil'
]);

const VALID_PRODUCT_SLUGS = new Set([
  'collagen','d-fenz-kids','genius-shake-kids','lattekaffe','nourish-plus','performance-plus',
  's-balance','smartbiotics-kids','v-asculax','v-control','v-curcumax','v-daily','v-fortyflora','v-glutation',
  'v-itadol','v-italay','v-italboost','v-itaren','v-lovkafe','v-neurokafe','v-nitro','v-nrgy','v-omega3',
  'v-organex','v-tedetox','v-thermokafe','vitalpro','v-glutation-plus','v-daily-sachet','v-harmony','v-prime','zilara-fulvic-minerals','zilara-fulvic-mineral-drops','zilara-paracleanse','zilara-heavy-metal-toxin-binder','zilara-cocoblue','orygn-triglp','orygn-ignyt','zilara-black-seed-oil'
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
  ['glp-1-supplements', { file: 'glp-1/glp-1-supplements.html', name: 'Do GLP-1 supplements work?', reviewed: '2026-11-11' }],
  ['glp-1-patches', { file: 'glp-1/glp-1-patches.html', name: 'Do GLP-1 patches work?', reviewed: '2026-11-11' }],
  ['retatrutide', { file: 'glp-1/retatrutide.html', name: 'Retatrutide', reviewed: '2026-11-10' }],
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

// Shared header, footer and palette for every page, so the whole site reads as one design.
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
.si-figure{margin:20px 0}
.si-figure img{display:block;max-width:100%;height:auto;border-radius:12px;background:#fff}
.si-figure figcaption{font-size:.9rem;color:#555;margin-top:6px;font-style:italic}
.si-main details{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin:10px 0}
.si-main summary{font-weight:700;color:#1a3d2e;cursor:pointer}
.si-crumbs{font-size:.92rem;color:#555}
.si-small{font-size:.9rem;color:#555}
.si-btn{display:block;text-align:center;background:#c4704a;color:#fff!important;text-decoration:none;font-weight:700;padding:12px 16px;border-radius:10px;margin:14px 0 8px}
.si-btn:hover{background:#a8532f}
.si-p-top{display:grid;grid-template-columns:1fr;gap:4px 24px;align-items:start}
@media(min-width:820px){.si-p-top{grid-template-columns:minmax(0,1fr) 300px}.si-p-top .si-p-image{grid-column:1/-1}}
.si-p-facts{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:18px 0}
.si-p-facts dl{margin:0}
.si-p-facts dl div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #f0ece6}
.si-p-facts dt{color:#555;font-size:.92rem}
.si-p-facts dd{margin:0;font-weight:700;color:#1a3d2e;text-align:right}
.si-p-image{margin:18px 0 0;text-align:center}
.si-p-image img{max-width:100%;height:auto;max-height:360px;object-fit:contain;background:#fff;border-radius:12px}
.si-chips{list-style:none;padding:0;margin:12px 0 18px;display:flex;flex-wrap:wrap;gap:8px}
.si-chip{background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:6px 14px;font-size:.95rem}
.si-chip-on{background:#e8f0ec;border-color:#c9dcd2}
.si-chip a{text-decoration:none;font-weight:700}
.si-chip a:hover{text-decoration:underline}
.si-cards{display:grid;grid-template-columns:1fr;gap:14px;margin:14px 0 20px}
@media(min-width:720px){.si-cards{grid-template-columns:1fr 1fr}}
.si-main .si-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:0}
.si-card h3{margin:0 0 6px;font-size:1.1rem}
.si-card h3 a{text-decoration:none}
.si-card p{margin:6px 0}
.si-card-link{font-size:.92rem}
.si-input{width:100%;max-width:420px;font:inherit;padding:10px 12px;border:1px solid #cfc8bf;border-radius:10px;background:#fff;margin-top:4px;box-sizing:border-box}
.si-home-hero{padding:8px 0 10px}
.si-home-hero h1{font-size:2.3rem;line-height:1.15;margin:6px 0 12px}
.si-home-lead{font-size:1.12rem;max-width:720px}
.si-home-search{margin:18px 0 8px;max-width:620px}
.si-home-search div{display:flex;gap:8px;align-items:stretch}
.si-home-search .si-input{max-width:none;flex:1;margin:4px 0 0}
.si-btn.si-home-go{display:inline-block;margin:4px 0 0;border:0;font:inherit;font-weight:700;cursor:pointer}
.si-results{list-style:none;padding:0;margin:10px 0;max-width:620px;background:#fff;border:1px solid #e5e7eb;border-radius:12px}
.si-results li{padding:10px 14px;border-bottom:1px solid #f0ece6;display:flex;flex-direction:column}
.si-results li:last-child{border-bottom:0}
.si-results a{font-weight:700;text-decoration:none}
.si-home-kind{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:#6b7c72}
.si-home-guides{display:grid;grid-template-columns:1fr;gap:14px;margin:14px 0 22px}
@media(min-width:720px){.si-home-guides{grid-template-columns:1fr 1fr 1fr}}
.si-home-guide{display:flex;flex-direction:column;gap:4px;background:#fff;border:1px solid #e5e7eb;border-top:4px solid #c4704a;border-radius:12px;padding:16px 18px;text-decoration:none;color:#2a2a2a}
.si-home-guide strong{color:#1a3d2e;font-size:1.12rem}
.si-home-guide:hover strong{text-decoration:underline}
.si-home-how{background:#e8f0ec;border-radius:14px;padding:6px 22px 14px;margin:26px 0 8px}
.si-home-how h2{font-size:1.3rem}
.si-home-how li{margin:8px 0}
@media(max-width:520px){.si-home-hero h1{font-size:1.85rem}}
.si-footer{background:#1a3d2e;color:rgba(255,255,255,.78);text-align:center;padding:32px 24px;font-size:.9rem}
.si-footer nav{display:flex;flex-wrap:wrap;justify-content:center;gap:0 22px;margin-bottom:12px}
.si-footer a{color:#e8a082;text-decoration:none;padding:8px 0;display:inline-block}
.si-footer a:hover{text-decoration:underline}
.si-footer p{margin:6px auto;max-width:720px}
`;

const SITE_HEADER = '<header class="si-header"><div class="si-inner"><a class="si-logo" href="/">Supplement<span>Intelligence</span></a><nav aria-label="Main"><a href="/glp-1">GLP-1</a><a href="/ingredients">Ingredient evidence</a><a href="/products">Products</a><a href="/references">Research status</a><a href="/about">About</a></nav></div></header>';

const SITE_FOOTER = '<footer class="si-footer"><nav aria-label="Footer"><a href="/glp-1">GLP-1 guides</a><a href="/ingredients">Ingredient evidence</a><a href="/products">Products</a><a href="/references">Research status</a><a href="/about">About</a><a href="/support">Support</a><a href="/disclaimer">Disclaimer</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/api/v1">API</a></nav><p>Supplement Intelligence may earn referral credit from some product links. Compensation does not determine evidence status.</p><p>For informational purposes only; not individualized medical advice.</p></footer>';

let cache = { productsData: null, ingredientData: null, ts: 0 };
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

  // Page images: binary files in images/ in the repo, read from the same pinned commit.
  const imageMatch = path.match(/^\/images\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(png|jpe?g|webp)$/);
  if (imageMatch) return handleImage(request, path.slice(1), imageMatch[1]);

  const guideMatch = path.match(/^\/glp-1(?:\/([a-z0-9-]+))?$/);
  if (guideMatch) {
    const guide = GLP1_GUIDES.get(guideMatch[1] || '');
    return guide ? handleGuide(path, guide) : notFound('Guide Not Found');
  }

  const productMatch = path.match(/^\/products\/([a-z0-9-]+)$/);
  if (productMatch) return handleProduct(url, productMatch[1]);

  const goMatch = path.match(/^\/go\/([a-z0-9-]+)$/);
  if (goMatch) return handleGo(request, goMatch[1]);

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

// Outbound affiliate links: /go/<product-slug> logs the click and forwards to the
// product's referral URL. The log line holds the product, brand, the site page the
// click came from and whether the client looks like a bot; no IP address or other
// personal data. View it in Cloudflare: Workers > supplementintel-products > Logs,
// searching for "affiliate_click".
async function handleGo(request, slug) {
  const productsData = await getProductsData();
  const product = productsData && productsData.products ? productsData.products[slug] : null;
  if (!product || !product.shopUrl) return notFound('Product Not Found');
  let from = null;
  try {
    const ref = new URL((request.headers && request.headers.get('Referer')) || '');
    if (ref.hostname === 'supplement-intelligence.com') from = ref.pathname;
  } catch (_) {}
  const ua = (request.headers && request.headers.get('User-Agent')) || '';
  console.log(JSON.stringify({
    event: 'affiliate_click', product: slug, brand: product.brand || 'Vital Health Global', from,
    bot: /bot|crawl|spider|slurp|preview|fetch|monitor|curl|python|wget/i.test(ua)
  }));
  return new Response(null, {
    status: 302,
    headers: { Location: product.shopUrl, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}

async function handleProduct(url, slug) {
  if (slug === 'nourish-plus-kids') return redirect(url, '/products/nourish-plus');
  if (!VALID_PRODUCT_SLUGS.has(slug)) return notFound('Product Not Found');

  const productsData = await getProductsData();
  if (!productsData) {
    return new Response('Unable to load product page resources', { status: 503, headers: textHeaders() });
  }
  const product = productsData.products[slug];
  if (!product) return notFound('Product data not found');

  const html = renderProductPage(product, productsData);
  return new Response(html, {
    status: 200,
    headers: htmlHeaders({ 'X-Product': slug, 'X-Powered-By': VERSION })
  });
}

// Homepage. Title, description, canonical and structured data are kept stable
// for search; the deploy check looks for "verification, not marketing claims".
const HOME_GUIDES = [
  ['/glp-1', 'GLP-1 guide', 'Supplements on GLP-1 drugs', 'What the evidence shows for protein, creatine, fiber, magnesium and biotin if you take semaglutide or tirzepatide.'],
  ['/glp-1/glp-1-supplements', 'GLP-1 guide', 'Do GLP-1 supplements work?', 'Patches, drops and "natural GLP-1" boosters checked against the trials, ingredient by ingredient.'],
  ['/glp-1/semaglutide-with-b12', 'GLP-1 guide', 'Semaglutide with B12', 'It is a compounded product, not an approved drug. Does the added B12 do anything?'],
  ['/glp-1/berberine-vs-ozempic', 'GLP-1 guide', 'Berberine vs Ozempic', 'Is berberine "nature\'s Ozempic"? What separate trials show for weight and blood sugar.'],
  ['/ingredients/lemon-balm', 'Ingredient review', 'Lemon balm', 'Benefits, side effects and what trials found for anxiety, sleep and cold sores.'],
  ['/ingredients/uva-ursi', 'Ingredient review', 'Uva ursi (bearberry)', 'What two large urinary tract infection trials found, and who should avoid it.'],
];

const HOME_TOPICS = [
  ['/ingredients/creatine-monohydrate', 'Creatine'], ['/ingredients/omega-3', 'Omega-3'], ['/ingredients/magnesium', 'Magnesium'],
  ['/ingredients/vitamin-d', 'Vitamin D'], ['/ingredients/berberine', 'Berberine'], ['/ingredients/ashwagandha', 'Ashwagandha'],
  ['/ingredients/curcumin', 'Curcumin'], ['/ingredients/caffeine', 'Caffeine'], ['/ingredients/probiotics', 'Probiotics'],
  ['/ingredients/collagen-peptides', 'Collagen'], ['/ingredients/l-theanine', 'L-theanine'], ['/ingredients/valerian', 'Valerian'],
  ['/ingredients/dandelion', 'Dandelion'],
];

async function handleHome() {
  const [productsData, ingredientData] = await Promise.all([getProductsData(), getIngredientData()]);
  const productCount = productsData && productsData.products ? Object.keys(productsData.products).length : 0;
  const ingredientCount = ingredientData && ingredientData.ingredients ? Object.keys(ingredientData.ingredients).length : 0;
  const n = (count, word) => count ? `${count} ${word}` : word;

  const guides = HOME_GUIDES.map(([href, kind, title, text]) =>
    `<a class="si-home-guide" href="${href}"><span class="si-home-kind">${escapeHtml(kind)}</span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></a>`).join('');
  const topics = HOME_TOPICS.map(([href, label]) => `<li class="si-chip si-chip-on"><a href="${href}">${escapeHtml(label)}</a></li>`).join('');

  // Search runs in the browser against /api/v1/search; without JavaScript the
  // form falls back to the full ingredient list.
  const script = `<script>(function(){
var f=document.getElementById('si-search'),i=document.getElementById('si-q'),o=document.getElementById('si-results');
if(!f||!window.fetch)return;
function add(t){o.textContent='';var p=document.createElement('p');p.className='si-small';p.textContent=t;o.appendChild(p);}
f.addEventListener('submit',function(e){
e.preventDefault();var q=i.value.trim();
if(q.length<2){add('Type at least two letters.');return;}
add('Searching...');
fetch('/api/v1/search?q='+encodeURIComponent(q)).then(function(r){return r.json();}).then(function(d){
var rs=(d&&d.results)||[];o.textContent='';
if(!rs.length){add('No matches for "'+q+'". Try an ingredient name such as magnesium or ashwagandha.');return;}
var ul=document.createElement('ul');ul.className='si-results';
rs.slice(0,12).forEach(function(x){
var li=document.createElement('li'),a=document.createElement('a'),s=document.createElement('span');
var u=String(x.canonical_url||'');a.href=u.replace(/^https:\\/\\/supplement-intelligence\\.com/,'');a.textContent=x.name;
s.className='si-home-kind';s.textContent=x.type==='product'?'Product':'Ingredient review';
li.appendChild(s);li.appendChild(a);ul.appendChild(li);});
o.appendChild(ul);
if(rs.length>12)add('Showing 12 of '+rs.length+' matches. Try a more specific term.');
}).catch(function(){add('Search is unavailable right now. Browse the ingredient list instead.');});
});})();</script>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Supplement Intelligence | Evidence-Based Ingredient & Supplement Research</title>
<meta name="description" content="Verification-first supplement research with current product formulations, 37 reviewed ingredient evidence pages, safety context, and primary-source citations.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://supplement-intelligence.com/">
</head>
<body>
<section class="si-home-hero">
<h1>What the research really says about supplements</h1>
<p class="si-home-lead">Plain-language reviews of supplement ingredients and GLP-1 questions, checked against published human studies and government sources, with the sources listed on every review.</p>
<form id="si-search" class="si-home-search" action="/ingredients" method="get" role="search">
<label for="si-q" class="si-small">Search an ingredient, product or health topic</label>
<div><input id="si-q" name="q" class="si-input" type="search" placeholder="e.g. magnesium, sleep, V-DAILY" autocomplete="off"><button type="submit" class="si-btn si-home-go">Search</button></div>
</form>
<div id="si-results" aria-live="polite"></div>
</section>

<h2>Start here</h2>
<div class="si-home-guides">${guides}</div>

<h2>Popular ingredients</h2>
<ul class="si-chips">${topics}</ul>
<p><a href="/ingredients"><strong>See all ${n(ingredientCount, 'ingredient reviews')} →</strong></a></p>

<div class="si-cards">
<article class="si-card"><h3><a href="/ingredients">Ingredient evidence</a></h3><p>What human studies show for each ingredient, who should avoid it, and how strong the evidence is.</p><p class="si-card-link"><a href="/ingredients">Browse ${n(ingredientCount, 'reviews')} →</a></p></article>
<article class="si-card"><h3><a href="/products">Products</a></h3><p>Vital Health Global, Zilara and Orygn products: what is on each label, with links to the research on every reviewed ingredient.</p><p class="si-card-link"><a href="/products">Browse ${n(productCount, 'products')} →</a></p></article>
</div>

<section class="si-home-how">
<h2>Supplement research built around verification, not marketing claims</h2>
<ul>
<li><strong>Sources you can check.</strong> Figures come from published trials, systematic reviews and government sources such as the NIH and the European Medicines Agency, listed on every review.</li>
<li><strong>Ingredients are not products.</strong> Research on one ingredient does not prove a finished product works, and each page says so.</li>
<li><strong>Dated reviews.</strong> Reviews show when they were last checked, and gaps in the evidence are stated rather than glossed over.</li>
</ul>
<p><a href="/references">Read how we review evidence</a> · <a href="/about">About Supplement Intelligence</a></p>
</section>
${script}
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

// A repo image (hero, Open Graph or infographic), streamed as bytes, not text.
const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
// Images not in the repo fall through to the legacy origin, as before.
async function handleImage(request, repoPath, ext) {
  let res;
  try {
    res = await fetch(contentUrl(repoPath), { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/11.0' }, cf: { cacheTtl: 86400 } });
  } catch (_) {
    return notFound('Image Not Found');
  }
  if (res.status === 404) {
    if (IS_PREVIEW) return notFound('Image Not Found');
    try {
      const origin = await fetch(request);
      const type = origin.headers.get('Content-Type') || '';
      return (origin.status === 200 && !type.includes('text/html')) ? origin : notFound('Image Not Found');
    } catch (_) {
      return notFound('Image Not Found');
    }
  }
  if (!res.ok) return new Response('Temporarily unavailable', { status: 503, headers: textHeaders({ 'Cache-Control': 'no-store' }) });
  return new Response(res.body, {
    status: 200,
    headers: { ...baseHeaders(IMAGE_TYPES[ext] || 'application/octet-stream'), 'Cache-Control': 'public, max-age=86400, s-maxage=604800', 'X-Powered-By': VERSION }
  });
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
    brand: p.brand || 'Vital Health Global',
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
    brand: p.brand || 'Vital Health Global',
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

// Product pages share the site header, footer and palette (via decorate).
// Content order: what the product is, what is on the label, what research says
// about those ingredients, similar products, and where the information comes from.
function renderProductPage(product, productsData) {
  const name = product.name;
  const formulationVerified = String(product.formulationStatus || '').toLowerCase().startsWith('verified against current manufacturer');
  const labelItems = formulationVerified ? normalizeText(product.ingredients || '').split(';').map(x => x.trim()).filter(Boolean) : [];
  const evidence = product.ingredientEvidenceLinks || [];
  const checked = formatLongDate(product.lastUpdated);
  const shopUrl = product.shopUrl || 'https://vitalhealthglobal.com/products';
  const brand = product.brand || 'Vital Health Global';
  const related = (product.relatedProducts && product.relatedProducts.length) ? product.relatedProducts : findRelatedProducts(product, productsData);

  // Which label items have an evidence review: the label item must contain the
  // reviewed ingredient's common name (text before any "(" or "/").
  const reviewedFor = item => {
    const lower = item.toLowerCase();
    return evidence.find(e => {
      const base = String(e.name || '').split(/[(\/]/)[0].trim().toLowerCase();
      return base && lower.includes(base);
    });
  };

  const title = `${name} Ingredients & Evidence Status | Supplement Intelligence`;
  const description = formulationVerified
    ? truncateText(`${name} ingredients and evidence status. Label lists: ${product.ingredients}`, 160)
    : truncateText(`${name}: the manufacturer has not published a complete ingredient list, so the ingredients cannot be reviewed yet.`, 160);

  let summary;
  if (!formulationVerified) {
    summary = `<p><strong>At a glance.</strong> When we checked the manufacturer's page on ${escapeHtml(checked)}, it did not publish a complete ingredient list for ${escapeHtml(name)}, so there is nothing to review yet. We will add the ingredients once the full label is available.</p>`
      + ((product.manufacturerDescriptionMentions || []).length ? `<p>The manufacturer's own description mentions: ${product.manufacturerDescriptionMentions.map(escapeHtml).join('; ')}. That is marketing text, not a label.</p>` : '');
  } else {
    const reviewedCount = evidence.length;
    summary = `<p><strong>At a glance.</strong> ${escapeHtml(name)} lists ${labelItems.length} ingredient${labelItems.length === 1 ? '' : 's'}. `
      + (reviewedCount
        ? `We have reviewed the human research on ${reviewedCount} of them, summarized below.</p>`
        : 'None of them has an evidence review on this site yet.</p>')
      + '<p>Studies of single ingredients cannot show what this product does: the amounts, form and combination in a finished product may differ from what was studied, and we have not reviewed trials of the product itself.</p>';
  }

  const facts = `<aside class="si-p-facts" aria-label="Product facts">
<dl>
<div><dt>Ingredients on label</dt><dd>${formulationVerified ? labelItems.length : 'Not published'}</dd></div>
<div><dt>With evidence reviews</dt><dd>${evidence.length}</dd></div>
<div><dt>Label checked</dt><dd>${escapeHtml(checked)}</dd></div>
</dl>
<a class="si-btn" href="/go/${escapeHtml(product.slug)}" target="_blank" rel="sponsored nofollow noopener">View ${escapeHtml(name)} at ${escapeHtml(brand)}</a>
<p class="si-small">We earn referral credit if you buy through this link. It does not change what we write.</p>
</aside>`;

  const image = product.image && product.image.src
    ? `<figure class="si-p-image"><img src="${escapeHtml(product.image.src)}" alt="${escapeHtml(product.image.alt || name)}" width="480" height="480" loading="eager"></figure>`
    : '';

  let labelHtml = '';
  if (labelItems.length) {
    labelHtml = '<h2 id="label">What is in ' + escapeHtml(name) + '</h2><p class="si-small">From the manufacturer\'s published product information, in label order. Linked ingredients have an evidence review on this site.</p><ul class="si-chips">'
      + labelItems.map(item => {
        const e = reviewedFor(item);
        return e
          ? `<li class="si-chip si-chip-on"><a href="${escapeHtml(e.url)}">${escapeHtml(item)}</a></li>`
          : `<li class="si-chip">${escapeHtml(item)}</li>`;
      }).join('') + '</ul>';
  }

  let evidenceHtml = '';
  if (evidence.length) {
    evidenceHtml = '<h2 id="evidence">What the research says about its ingredients</h2><div class="si-cards">'
      + evidence.map(e => `<article class="si-card"><h3><a href="${escapeHtml(e.url)}">${escapeHtml(e.name)}</a></h3><p>${escapeHtml(e.posture || '')}</p><p class="si-card-link"><a href="${escapeHtml(e.url)}">Read the evidence review →</a></p></article>`).join('')
      + '</div>';
  }

  const relatedHtml = related.length
    ? '<h2 id="related">Products with shared ingredients</h2><ul class="si-chips">' + related.map(r => `<li class="si-chip si-chip-on"><a href="${escapeHtml(r.url)}">${escapeHtml(r.name || r.slug)}</a></li>`).join('') + '</ul>'
    : '';

  const source = product.formulationSource
    ? `<a href="${escapeHtml(product.formulationSource)}" rel="noopener">manufacturer's published product information</a>`
    : "manufacturer's product page";
  const coaHtml = product.coa && product.coa.url
    ? `<h2 id="testing">Testing</h2><p>${escapeHtml(product.coa.note || '')} <a href="${escapeHtml(product.coa.url)}" rel="noopener">View the certificate of analysis</a>.</p>`
    : '';
  const guidesHtml = (product.guides || []).length
    ? '<h2 id="guides">Related evidence guides</h2><ul class="si-chips">' + product.guides.map(g => `<li class="si-chip si-chip-on"><a href="${escapeHtml(g.url)}">${escapeHtml(g.name)}</a></li>`).join('') + '</ul>'
    : '';
  const aboutHtml = `<h2 id="about">About this page</h2>
<p>The ingredient list comes from the ${source}, checked on ${escapeHtml(checked)}. The ingredient summaries come from our evidence reviews, which use published human studies and government sources; each review lists its sources. See <a href="/references">how we review evidence</a>.</p>
<p>Supplement Intelligence is run by a ${escapeHtml(brand)} affiliate and earns referral credit on purchases made through links on this page.</p>
<p class="si-small">For informational purposes only; not individualized medical advice. Talk to a clinician before starting a supplement, especially if you are pregnant, breastfeeding, take medicines or have a health condition. These statements have not been evaluated by the FDA.</p>`;

  const body = `<p class="si-crumbs"><a href="/">Home</a> / <a href="/products">Products</a> / ${escapeHtml(name)}</p>
<h1>${escapeHtml(name)}</h1>
<p class="si-meta">Ingredients and evidence summary · label checked ${escapeHtml(checked)}</p>
<div class="si-p-top">${image}<div class="si-p-lead"><div class="si-verdict">${summary}</div></div>${facts}</div>
${labelHtml}
${evidenceHtml}
${relatedHtml}
${coaHtml}
${guidesHtml}
${aboutHtml}`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${SITE_ORIGIN}/products/${product.slug}"></head><body>${body}</body></html>`;
  return decorate(html, {
    path: '/products/' + product.slug,
    ogType: 'product',
    wide: true,
    breadcrumbs: [['Products', '/products'], [name, '/products/' + product.slug]],
    jsonLd: [{
      '@context': 'https://schema.org', '@type': 'Product', name,
      description,
      brand: { '@type': 'Brand', name: brand },
      category: product.category || 'Dietary supplement',
      url: `${SITE_ORIGIN}/products/${product.slug}`
    }]
  });
}

function renderProductsIndex(productsData) {
  const products = Object.values(productsData.products || {}).sort((a, b) => a.name.localeCompare(b.name));
  const brandOf = p => p.brand || 'Vital Health Global';
  const brands = [...new Set(products.map(brandOf))].sort((a, b) => (a === 'Vital Health Global' ? -1 : b === 'Vital Health Global' ? 1 : a.localeCompare(b)));
  const card = p => {
    const verified = String(p.formulationStatus || '').toLowerCase().startsWith('verified against current manufacturer');
    const items = verified ? normalizeText(p.ingredients || '').split(';').map(x => x.trim()).filter(Boolean) : [];
    const reviewed = (p.ingredientEvidenceLinks || []).length;
    const preview = items.slice(0, 4).join(', ') + (items.length > 4 ? ', …' : '');
    const stats = verified
      ? `${items.length} ingredient${items.length === 1 ? '' : 's'} · ${reviewed} with evidence review${reviewed === 1 ? '' : 's'}`
      : 'Full ingredient list not published by the manufacturer';
    const searchText = [p.name, verified ? p.ingredients : ''].join(' ').toLowerCase();
    return `<article class="si-card" data-search="${escapeHtml(searchText)}"><h3><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>`
      + (preview ? `<p>${escapeHtml(preview)}</p>` : '')
      + `<p class="si-small">${escapeHtml(stats)}</p></article>`;
  };
  const cards = brands.map(b => `<section class="si-brand"><h2>${escapeHtml(b)}</h2><div class="si-cards">${products.filter(p => brandOf(p) === b).map(card).join('')}</div></section>`).join('');
  const filter = `<p><label for="si-filter" class="si-small">Filter by product or ingredient</label><br><input id="si-filter" class="si-input" type="search" placeholder="e.g. turmeric, collagen, V-DAILY" autocomplete="off"></p><p id="si-none" class="si-small" hidden>No products match.</p>`;
  const script = `<script>(function(){var i=document.getElementById('si-filter');if(!i)return;var c=[].slice.call(document.querySelectorAll('.si-cards .si-card'));var n=document.getElementById('si-none');var g=[].slice.call(document.querySelectorAll('.si-brand'));i.addEventListener('input',function(){var q=i.value.trim().toLowerCase(),s=0;c.forEach(function(e){var m=!q||e.getAttribute('data-search').indexOf(q)>-1;e.hidden=!m;if(m)s++;});g.forEach(function(x){x.hidden=!x.querySelector('.si-card:not([hidden])');});n.hidden=s>0;});})();</script>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Supplement Products: Ingredients & Evidence Status | Supplement Intelligence</title><meta name="description" content="Ingredient lists for ${products.length} ${brands.join(', ').replace(/, ([^,]*)$/, ' and $1')} products, checked against manufacturer labels, with links to reviewed evidence for each ingredient."><link rel="canonical" href="https://supplement-intelligence.com/products"></head><body><p class="si-crumbs"><a href="/">Home</a> / Products</p><h1>Products we track</h1><p>Ingredient lists for ${products.length} ${brands.join(', ').replace(/, ([^,]*)$/, ' and $1')} products, checked against the manufacturers' labels, with links to what the research says about each reviewed ingredient. Research on single ingredients is not proof that a finished product works.</p>${filter}${cards}<p class="si-small">Supplement Intelligence is run by an affiliate of each of these companies and earns referral credit on purchases made through product links.</p>${script}</body></html>`;
  return decorate(html, { path: '/products', wide: true, breadcrumbs: [['Products', '/products']] });
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
