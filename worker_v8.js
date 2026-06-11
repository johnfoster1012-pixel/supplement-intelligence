/**
 * Supplement Intelligence Worker v9 — content-correction
 *
 * Canonical surface: /products/:slug (Worker-rendered from repo data).
 * - 301s known root hub slugs (/:slug/) to /products/:slug (Worker-canonical, Path B).
 * - 301s retired article/ingredient/database URLs to their corrected destinations
 *   (server-side replacement for the interim meta-refresh stubs).
 * - Any path not explicitly handled (including "/") passes through to origin via
 *   fetch(request), so deploying on a /* route can never 404 the homepage.
 *
 * Preview: `wrangler dev --var CONTENT_BRANCH:content-correction` renders branch
 * content; the pass-through returns a text marker locally (fetch(request) to the
 * dev host would self-loop). In production CONTENT_BRANCH is unset: content comes
 * from main and pass-through hits origin.
 */
const CONTENT_BRANCH_NAME = (typeof CONTENT_BRANCH !== 'undefined' && CONTENT_BRANCH) ? CONTENT_BRANCH : 'main';
const IS_PREVIEW = CONTENT_BRANCH_NAME !== 'main';
// CONTENT_BASE (dev-only var) lets wrangler dev serve content from a local file server
// before the branch is pushed. Production default: GitHub raw on main.
const GITHUB_RAW_BASE = (typeof CONTENT_BASE !== 'undefined' && CONTENT_BASE)
  ? CONTENT_BASE
  : `https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/${CONTENT_BRANCH_NAME}/`;
const VERSION = 'Supplement Intelligence v9';

const VALID_PRODUCT_SLUGS = new Set([
  'collagen','d-fenz-kids','genius-shake-kids','lattekaffe','nourish-plus','performance-plus',
  's-balance','smartbiotics-kids','v-asculax','v-control','v-curcumax','v-daily','v-fortyflora','v-glutation',
  'v-itadol','v-italay','v-italboost','v-itaren','v-lovkafe','v-neurokafe','v-nitro','v-nrgy','v-omega3',
  'v-organex','v-tedetox','v-thermokafe','vitalpro'
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
  ['glutathione', '/products/v-glutation'],
  ['curcumin', '/products/v-curcumax'],
  ['omega-3-fatty-acids', '/products/v-omega3'],
  ['marine-collagen-peptides', '/products/collagen'],
  ['bacopa-monnieri', '/products'], // fabricated pairing — bacopa is in no product
]);

// Retired study-database pages (fabricated topics).
const DATABASE_REDIRECTS = new Map([
  ['berberine-studies', '/products'],
  ['ashwagandha-studies', '/products'],
  ['nac-studies', '/products'],
]);

let cache = { template: null, productsData: null, ts: 0 };
const CACHE_TTL = 3600000;

addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (path === '/llm.txt') return proxyRawText('llm.txt', 'text/plain; charset=utf-8');
  if (path === '/sitemap.xml') return proxyRawText('sitemap.xml', 'application/xml; charset=utf-8');

  if (path === '/products') return handleProductsIndex();
  if (path === '/formulary') return redirect(url, '/products');
  if (path === '/articles') return proxyRawText('articles/index.html', 'text/html; charset=utf-8');
  if (path === '/research') return redirect(url, '/articles');
  if (path === '/ingredients') return proxyRawText('ingredients/index.html', 'text/html; charset=utf-8');
  if (path === '/database') return proxyRawText('database/index.html', 'text/html; charset=utf-8');

  const productMatch = path.match(/^\/products\/([a-z0-9-]+)$/);
  if (productMatch) return handleProduct(url, productMatch[1]);

  const articleMatch = path.match(/^\/articles\/([a-z0-9-]+?)(\.html)?$/);
  if (articleMatch) {
    const target = ARTICLE_REDIRECTS.get(articleMatch[1]);
    return target ? redirect(url, target) : notFound('Article Not Found');
  }

  const ingredientMatch = path.match(/^\/ingredients\/([a-z0-9-]+)$/);
  if (ingredientMatch) {
    const target = INGREDIENT_REDIRECTS.get(ingredientMatch[1]);
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

  // Homepage safety: everything unmatched — including "/", /about, and any unknown
  // path — passes through to origin (the Pages project) untouched.
  if (IS_PREVIEW) {
    return new Response(`PASSTHROUGH -> origin (${url.pathname})`, { status: 200, headers: textHeaders({ 'X-Passthrough': '1' }) });
  }
  return fetch(request);
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

  const html = renderProductPage(template, product);
  return new Response(html, {
    status: 200,
    headers: htmlHeaders({ 'X-Product': slug, 'X-Powered-By': VERSION })
  });
}

async function handleProductsIndex() {
  const productsData = await getProductsData();
  if (!productsData) return new Response('Unable to load products', { status: 503, headers: textHeaders() });
  const html = renderProductsIndex(productsData);
  return new Response(html, { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

async function proxyRawText(path, contentType) {
  try {
    const res = await fetch(GITHUB_RAW_BASE + path, { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/9.0' }, cf: { cacheTtl: 3600 } });
    if (!res.ok) return new Response('Temporarily unavailable', { status: 503, headers: textHeaders() });
    const body = normalizeText(await res.text());
    return new Response(body, { status: 200, headers: baseHeaders(contentType) });
  } catch (err) {
    return new Response('Error fetching content: ' + err.message, { status: 500, headers: textHeaders() });
  }
}

async function getTemplate() {
  const now = Date.now();
  if (cache.template && (now - cache.ts) < CACHE_TTL) return cache.template;
  try {
    const res = await fetch(GITHUB_RAW_BASE + 'product-template.html', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/9.0' }, cf: { cacheTtl: 3600 } });
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
    const res = await fetch(GITHUB_RAW_BASE + 'products-data.json', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/9.0' }, cf: { cacheTtl: 3600 } });
    if (res.ok) {
      const json = await res.json();
      cache.productsData = deepNormalize(json);
      cache.ts = now;
      return cache.productsData;
    }
  } catch (_) {}
  return cache.productsData;
}

function renderProductPage(template, product) {
  let html = template;
  const citations = product.citations || [];
  const grade = product.evidenceGrade || 'Under Review';

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
  html = html.replace(/\{\{PRODUCT_INGREDIENTS\}\}/g, escapeHtml(product.ingredients));
  html = html.replace(/\{\{EVIDENCE_GRADE\}\}/g, escapeHtml(grade));
  html = html.replace(/\{\{TOTAL_CITATIONS\}\}/g, String(product.totalCitations || citations.length));
  html = html.replace(/\{\{LAST_UPDATED\}\}/g, escapeHtml(formatDate(product.lastUpdated)));
  html = html.replace(/\{\{PRODUCT_TLDR\}\}/g, formatParagraphs(product.tldr || ''));
  html = html.replace(/\{\{PRODUCT_TLDR_SHORT\}\}/g, escapeHtml(truncateText(product.tldr || '', 160)));
  html = html.replace(/\{\{RESEARCH_CONTENT\}\}/g, formatParagraphs(product.research || ''));
  html = html.replace(/\{\{MECHANISM\}\}/g, formatParagraphs((product.mechanism || '').replace(/^The mechanism is:\s*/i, '')));
  html = html.replace(/\{\{INGREDIENTS_LIST\}\}/g, formatIngredients(product.ingredients || ''));
  html = html.replace(/\{\{CITATIONS_LIST\}\}/g, formatCitations(citations));
  html = html.replace(/\{\{FAQS_LIST\}\}/g, formatFaqs(product.faqs || []));
  html = html.replace(/\{\{RELATED_PRODUCTS\}\}/g, formatRelatedProducts(product.relatedProducts || []));

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
        <p>${escapeHtml(truncateText(p.tldr || '', 220))}</p>
        <p>${evidence}</p>
      </article>`;
    }
    groupsHtml += '</section>';
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Products | Supplement Intelligence</title><meta name="description" content="Verified product information across the Supplement Intelligence formulary."><link rel="canonical" href="https://supplement-intelligence.com/products"><style>body{font-family:Arial,sans-serif;max-width:980px;margin:0 auto;padding:24px;line-height:1.6}a{color:#0a66c2;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><p><a href="/">Home</a> / Products</p><h1>All Products</h1><p>Independent product information for the Vital Health Global catalog. Ingredient lists are label-verified; a full evidence review is in progress.</p>${groupsHtml}</body></html>`;
}

function formatParagraphs(text) {
  return normalizeText(text).split(/\n\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n');
}

function formatIngredients(text) {
  const items = normalizeText(text).split(';').map(x => x.trim()).filter(Boolean);
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
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
  return relatedProducts.map(r => `<li><a href="${escapeHtml(r.url)}">${escapeHtml(r.name || r.slug)}</a></li>`).join('');
}

function normalizeText(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/â/g, '—').replace(/â/g, '–').replace(/â/g, '’').replace(/â/g, '“').replace(/â/g, '”')
    .replace(/Ã¶/g, 'ö').replace(/Ã±/g, 'ñ').replace(/Ã©/g, 'é').replace(/Ã¼/g, 'ü').replace(/Ã-/g, 'í')
    .replace(/\x80\x94/g, '—').replace(/\x80/g, '').replace(/-/g, '—').replace(/-/g, '–')
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
  return { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600, s-maxage=86400' };
}
function htmlHeaders(extra={}) { return { ...baseHeaders('text/html; charset=utf-8'), ...extra }; }
function textHeaders(extra={}) { return { ...baseHeaders('text/plain; charset=utf-8'), ...extra }; }
function notFound(msg) { return new Response(msg, { status: 404, headers: textHeaders({ 'X-Powered-By': VERSION }) }); }
