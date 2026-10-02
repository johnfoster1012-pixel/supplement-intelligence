/**
 * Supplement Intelligence Worker v10 — verification-first rebuild.
 *
 * Canonical surfaces are Worker-rendered product pages and verified ingredient
 * evidence pages. Historical study/database routes are redirected away from
 * withdrawn data. The root homepage is price-free and Worker-rendered.
 */
const CONTENT_BRANCH_NAME = (typeof CONTENT_BRANCH !== 'undefined' && CONTENT_BRANCH) ? CONTENT_BRANCH : 'main';
const IS_PREVIEW = CONTENT_BRANCH_NAME !== 'main';
// CONTENT_BASE (dev-only var) lets wrangler dev serve content from a local file server
// before the branch is pushed. Production default: GitHub raw on main.
const GITHUB_RAW_BASE = (typeof CONTENT_BASE !== 'undefined' && CONTENT_BASE)
  ? CONTENT_BASE
  : `https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/${CONTENT_BRANCH_NAME}/`;
const VERSION = 'Supplement Intelligence v10';

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
  'zinc'
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

// Retired study-database pages (fabricated topics).
const DATABASE_REDIRECTS = new Map([
  ['berberine-studies', '/ingredients/berberine'],
  ['ashwagandha-studies', '/ingredients/ashwagandha'],
  ['nac-studies', '/references'],
]);

let cache = { template: null, productsData: null, ts: 0 };
const CACHE_TTL = 3600000;

addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (path === '/llm.txt') return proxyRawText('llm.txt', 'text/plain; charset=utf-8');
  if (path === '/llms.txt') return proxyRawText('llms.txt', 'text/plain; charset=utf-8');
  if (path === '/robots.txt') return proxyRawText('robots.txt', 'text/plain; charset=utf-8');
  if (path === '/sitemap.xml') return proxyRawText('sitemap.xml', 'application/xml; charset=utf-8');

  if (path === '/') return handleHome();
  if (path === '/products') return handleProductsIndex();
  if (path === '/formulary') return redirect(url, '/products');
  if (path === '/articles') return proxyRawText('articles/index.html', 'text/html; charset=utf-8');
  if (path === '/research') return redirect(url, '/articles');
  if (path === '/ingredients') return proxyRawText('ingredients/index.html', 'text/html; charset=utf-8');
  if (path === '/database') return redirect(url, '/references');
  if (path === '/about' || path === '/about.html') return proxyRawText('site/about.html', 'text/html; charset=utf-8');
  if (path === '/references' || path === '/references.html') return proxyRawText('site/references.html', 'text/html; charset=utf-8');
  if (path === '/disclaimer' || path === '/disclaimer.html') return proxyRawText('site/disclaimer.html', 'text/html; charset=utf-8');

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
    if (VALID_INGREDIENT_SLUGS.has(slug)) return proxyRawText(`ingredients/${slug}.html`, 'text/html; charset=utf-8');
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

async function handleHome() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supplement Intelligence | Verification-First Supplement Research</title><meta name="description" content="Verification-first supplement formulation and evidence research."><link rel="canonical" href="https://supplement-intelligence.com/"><style>body{font-family:Arial,sans-serif;max-width:980px;margin:0 auto;padding:28px;line-height:1.65;color:#18202a}a{color:#0a66c2;text-decoration:none}.box{border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin:18px 0}</style></head><body><header><strong>Supplement Intelligence</strong> · <a href="/products">Products</a> · <a href="/references">Research status</a> · <a href="/about">About</a></header><h1>Supplement research with a verification-first standard</h1><p>Supplement Intelligence organizes supplement product data and supporting research. Product labels and citations are being re-verified before evidence claims are republished.</p><p><a href="/products"><strong>Browse product records →</strong></a></p><div class="box"><h2>Current evidence status</h2><p>Historical citation sets that did not meet the current verification standard have been withdrawn. Product pages marked Under Review should not be interpreted as having a finalized evidence grade or verified formulation.</p></div><div class="box"><h2>Commercial disclosure</h2><p>Supplement Intelligence may earn referral credit from purchases made through some product links. Compensation does not determine evidence status.</p></div><p>For informational purposes only; not individualized medical advice.</p></body></html>`;
  return new Response(html,{status:200,headers:htmlHeaders({'X-Powered-By':VERSION})});
}

async function handleProductsIndex() {
  const productsData = await getProductsData();
  if (!productsData) return new Response('Unable to load products', { status: 503, headers: textHeaders() });
  const html = renderProductsIndex(productsData);
  return new Response(html, { status: 200, headers: htmlHeaders({ 'X-Powered-By': VERSION }) });
}

async function proxyRawText(path, contentType) {
  try {
    const res = await fetch(GITHUB_RAW_BASE + path, { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/10.0' }, cf: { cacheTtl: 3600 } });
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
    const res = await fetch(GITHUB_RAW_BASE + 'product-template.html', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/10.0' }, cf: { cacheTtl: 3600 } });
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
    const res = await fetch(GITHUB_RAW_BASE + 'products-data.json', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/10.0' }, cf: { cacheTtl: 3600 } });
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
  const underReview = String(grade).toLowerCase() === 'under review';
  const formulationVerified = String(product.formulationStatus || '').toLowerCase().startsWith('verified against current manufacturer');
  const publicIngredients = formulationVerified ? (product.ingredients || '') : 'Formulation re-verification in progress.';
  const publicTldr = underReview ? 'This product record is undergoing current-label and evidence re-verification. Ingredient-specific efficacy claims are not being asserted until that review is complete.' : (product.tldr || '');
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
  html = html.replace(/\{\{PRODUCT_TLDR_SHORT\}\}/g, escapeHtml(truncateText(publicTldr, 160)));
  html = html.replace(/\{\{RESEARCH_CONTENT\}\}/g, formatParagraphs(publicResearch));
  html = html.replace(/\{\{MECHANISM\}\}/g, formatParagraphs((product.mechanism || '').replace(/^The mechanism is:\s*/i, '')));
  html = html.replace(/\{\{INGREDIENTS_LIST\}\}/g, formatIngredients(publicIngredients));
  html = html.replace(/\{\{INGREDIENT_EVIDENCE_LINKS\}\}/g, formatIngredientEvidenceLinks(product.ingredientEvidenceLinks || []));
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
        <p>${escapeHtml(String(p.formulationStatus || '').toLowerCase().startsWith('verified against current manufacturer') ? 'Current manufacturer formulation checked Oct 2026. Efficacy evidence remains under review.' : 'Formulation and efficacy evidence are under review.')}</p>
        <p>${evidence}</p>
      </article>`;
    }
    groupsHtml += '</section>';
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Products | Supplement Intelligence</title><meta name="description" content="Verified product information across the Supplement Intelligence formulary."><link rel="canonical" href="https://supplement-intelligence.com/products"><style>body{font-family:Arial,sans-serif;max-width:980px;margin:0 auto;padding:24px;line-height:1.6}a{color:#0a66c2;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><p><a href="/">Home</a> / Products</p><h1>All Products</h1><p>Independent product information for the Vital Health Global catalog. Product formulation records are undergoing label re-verification; a full evidence review is in progress.</p>${groupsHtml}</body></html>`;
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
  return relatedProducts.map(r => `<li><a href="${escapeHtml(r.url)}">${escapeHtml(r.name || r.slug)}</a></li>`).join('');
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
  return { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600, s-maxage=86400' };
}
function htmlHeaders(extra={}) { return { ...baseHeaders('text/html; charset=utf-8'), ...extra }; }
function textHeaders(extra={}) { return { ...baseHeaders('text/plain; charset=utf-8'), ...extra }; }
function notFound(msg) { return new Response(msg, { status: 404, headers: textHeaders({ 'X-Powered-By': VERSION }) }); }
