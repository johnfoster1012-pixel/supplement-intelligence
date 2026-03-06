/**
 * Supplement Intelligence Worker v8
 * Fixes broken /products and /articles index routes, adds ingredient-first routes,
 * preserves existing product/article URLs, and normalizes mojibake text artifacts.
 */
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/main/';

const VALID_ARTICLE_SLUGS = new Set([
  'collagen-benefits','d-fenz-kids-benefits','genius-shake-kids-benefits','lattekaffe-benefits',
  'nourish-plus-benefits','nourish-plus-kids-benefits','performance-plus-benefits','s-balance-benefits',
  'smartbiotics-kids-benefits','v-asculax-benefits','v-control-benefits','v-curcumax-benefits',
  'v-daily-benefits','v-fortyflora-benefits','v-glutation-benefits','v-itadol-benefits','v-italay-benefits',
  'v-italboost-benefits','v-itaren-benefits','v-lovkafe-benefits','v-neurokafe-benefits','v-nitro-benefits',
  'v-nrgy-benefits','v-omega3-benefits','v-organex-benefits','v-tedetox-benefits','v-thermokafe-benefits','vitalpro-benefits',
  'top-5-ingredients','dosage-side-effects','complete-guide','lions-mane-benefits','l-theanine-focus',
  'bacopa-memory','v-neurokafe-vs-coffee','l-theanine-vs-caffeine','best-supplement-students','best-nootropic-work'
]);

const VALID_PRODUCT_SLUGS = new Set([
  'collagen','d-fenz-kids','genius-shake-kids','lattekaffe','nourish-plus-kids','nourish-plus','performance-plus',
  's-balance','smartbiotics-kids','v-asculax','v-control','v-curcumax','v-daily','v-fortyflora','v-glutation',
  'v-itadol','v-italay','v-italboost','v-itaren','v-lovkafe','v-neurokafe','v-nitro','v-nrgy','v-omega3',
  'v-organex','v-tedetox','v-thermokafe','vitalpro'
]);

const VALID_INGREDIENT_SLUGS = new Set([
  'glutathione','marine-collagen-peptides','curcumin','omega-3-fatty-acids','bacopa-monnieri'
]);

const VALID_DATABASE_SLUGS = new Set([
  'ashwagandha-studies','berberine-studies','nac-studies'
]);

const PRODUCT_INGREDIENT_LINKS = {
  'v-glutation': ['glutathione'],
  'collagen': ['marine-collagen-peptides'],
  'v-curcumax': ['curcumin'],
  'v-omega3': ['omega-3-fatty-acids'],
  'v-neurokafe': ['bacopa-monnieri']
};

let cache = { template: null, productsData: null, ingredientData: null, ts: 0 };
const CACHE_TTL = 3600000;

addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (path === '/llm.txt') return proxyRawText('llm.txt', 'text/plain; charset=utf-8');
  if (path === '/sitemap.xml') return proxyRawText('sitemap.xml', 'application/xml; charset=utf-8');

  if (path === '/products' || path === '/formulary') return handleProductsIndex();
  if (path === '/articles' || path === '/research') return proxyRawText('articles/index.html', 'text/html; charset=utf-8');
  if (path === '/ingredients') return proxyRawText('ingredients/index.html', 'text/html; charset=utf-8');
  if (path === '/database') return proxyRawText('database/index.html', 'text/html; charset=utf-8');

  const databaseMatch = path.match(/^\/database\/([a-z0-9-]+)$/);
  if (databaseMatch) return handleDatabase(databaseMatch[1]);

  const ingredientMatch = path.match(/^\/ingredients\/([a-z0-9-]+)$/);
  if (ingredientMatch) return handleIngredient(ingredientMatch[1]);

  const productMatch = path.match(/^\/products\/([a-z0-9-]+)$/);
  if (productMatch) return handleProduct(productMatch[1]);

  const articleMatch = path.match(/^\/articles\/([a-z0-9-]+?)(\.html)?$/);
  if (articleMatch) return handleArticle(articleMatch[1]);

  return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function handleArticle(slug) {
  if (!VALID_ARTICLE_SLUGS.has(slug)) return notFound('Article Not Found');
  return proxyRawText(`articles/${slug}.html`, 'text/html; charset=utf-8');
}

async function handleIngredient(slug) {
  if (!VALID_INGREDIENT_SLUGS.has(slug)) return notFound('Ingredient Not Found');
  return proxyRawText(`ingredients/${slug}.html`, 'text/html; charset=utf-8');
}

async function handleDatabase(slug) {
  if (!VALID_DATABASE_SLUGS.has(slug)) return notFound('Study Database Page Not Found');
  return proxyRawText(`database/${slug}.html`, 'text/html; charset=utf-8');
}

async function handleProduct(slug) {
  if (!VALID_PRODUCT_SLUGS.has(slug)) return notFound('Product Not Found');

  const [template, productsData, ingredientData] = await Promise.all([
    getTemplate(), getProductsData(), getIngredientData()
  ]);
  if (!template || !productsData) {
    return new Response('Unable to load product page resources', { status: 503, headers: textHeaders() });
  }
  const product = productsData.products[slug];
  if (!product) return notFound('Product data not found');

  const html = renderProductPage(template, product, ingredientData);
  return new Response(html, {
    status: 200,
    headers: htmlHeaders({ 'X-Product': slug, 'X-Powered-By': 'Supplement Intelligence v8' })
  });
}

async function handleProductsIndex() {
  const productsData = await getProductsData();
  if (!productsData) return new Response('Unable to load products', { status: 503, headers: textHeaders() });
  const html = renderProductsIndex(productsData);
  return new Response(html, { status: 200, headers: htmlHeaders({ 'X-Powered-By': 'Supplement Intelligence v8' }) });
}

async function proxyRawText(path, contentType) {
  try {
    const res = await fetch(GITHUB_RAW_BASE + path, { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/8.0' }, cf: { cacheTtl: 3600 } });
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
    const res = await fetch(GITHUB_RAW_BASE + 'product-template.html', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/8.0' }, cf: { cacheTtl: 3600 } });
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
    const res = await fetch(GITHUB_RAW_BASE + 'products-data.json', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/8.0' }, cf: { cacheTtl: 3600 } });
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
    const res = await fetch(GITHUB_RAW_BASE + 'ingredient-data.json', { headers: { 'User-Agent': 'Supplement-Intelligence-Worker/8.0' }, cf: { cacheTtl: 3600 } });
    if (res.ok) {
      const json = await res.json();
      cache.ingredientData = deepNormalize(json);
      cache.ts = now;
      return cache.ingredientData;
    }
  } catch (_) {}
  return cache.ingredientData;
}

function renderProductPage(template, product, ingredientData) {
  let html = template;
  const ingredientHub = buildIngredientHub(product, ingredientData);

  html = html.replace(/\{\{PRODUCT_NAME\}\}/g, escapeHtml(product.name));
  html = html.replace(/\{\{PRODUCT_SLUG\}\}/g, product.slug);
  html = html.replace(/\{\{PRODUCT_CATEGORY\}\}/g, escapeHtml(product.category || 'General'));
  html = html.replace(/\{\{PRODUCT_CATEGORY_DISPLAY\}\}/g, escapeHtml(formatCategory(product.category)));
  html = html.replace(/\{\{PRODUCT_INGREDIENTS\}\}/g, escapeHtml(product.ingredients));
  html = html.replace(/\{\{EVIDENCE_GRADE\}\}/g, escapeHtml(product.evidenceGrade || 'B'));
  html = html.replace(/\{\{EVIDENCE_GRADE_NUMERIC\}\}/g, gradeToNumeric(product.evidenceGrade));
  html = html.replace(/\{\{TOTAL_CITATIONS\}\}/g, String(product.totalCitations || (product.citations || []).length));
  html = html.replace(/\{\{LAST_UPDATED\}\}/g, escapeHtml(formatDate(product.lastUpdated)));
  html = html.replace(/\{\{ARTICLE_URL\}\}/g, escapeHtml(product.articleUrl || `/articles/${product.slug}-benefits`));
  html = html.replace(/\{\{PRODUCT_TLDR\}\}/g, formatParagraphs(product.tldr || ''));
  html = html.replace(/\{\{PRODUCT_TLDR_SHORT\}\}/g, escapeHtml(truncateText(product.tldr || '', 160)));
  html = html.replace(/\{\{RESEARCH_CONTENT\}\}/g, formatParagraphs(product.research || ''));
  html = html.replace(/\{\{MECHANISM\}\}/g, formatParagraphs((product.mechanism || '').replace(/^The mechanism is:\s*/i, '')));
  html = html.replace(/\{\{INGREDIENTS_LIST\}\}/g, formatIngredients(product.ingredients || ''));
  html = html.replace(/\{\{CITATIONS_LIST\}\}/g, formatCitations(product.citations || []));
  html = html.replace(/\{\{FAQS_LIST\}\}/g, formatFaqs(product.faqs || []));
  html = html.replace(/\{\{RELATED_PRODUCTS\}\}/g, formatRelatedProducts(product.relatedProducts || []));

  html = html.replace('</body>', `${ingredientHub}</body>`);
  return normalizeText(html);
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
      groupsHtml += `<article style="border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:14px 0;">
        <h3><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
        <p>${escapeHtml(truncateText(p.tldr || '', 220))}</p>
        <p><strong>Evidence grade:</strong> ${escapeHtml(p.evidenceGrade || 'B')} · <strong>Citations:</strong> ${escapeHtml(String(p.totalCitations || (p.citations||[]).length))}</p>
        <p><a href="${escapeHtml(p.articleUrl || `/articles/${p.slug}-benefits`)}">Read supporting article</a></p>
      </article>`;
    }
    groupsHtml += '</section>';
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Products | Supplement Intelligence</title><meta name="description" content="Evidence-backed product research across the Supplement Intelligence formulary."><style>body{font-family:Arial,sans-serif;max-width:980px;margin:0 auto;padding:24px;line-height:1.6}a{color:#0a66c2;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><p><a href="/">Home</a> / Products</p><h1>All Products</h1><p>This index now resolves directly instead of falling back to the homepage. Existing product URLs remain unchanged.</p><p><a href="/ingredients">Browse the ingredient research database</a></p>${groupsHtml}</body></html>`;
}

function buildIngredientHub(product, ingredientData) {
  if (!ingredientData || !Array.isArray(ingredientData.ingredients)) return '';
  const slugs = PRODUCT_INGREDIENT_LINKS[product.slug] || [];
  if (!slugs.length) return '';
  const cards = ingredientData.ingredients.filter(i => slugs.includes(i.slug));
  if (!cards.length) return '';
  const links = cards.map(i => `<li><a href="/ingredients/${escapeHtml(i.slug)}">${escapeHtml(i.name)}</a> — ${escapeHtml(i.subtitle || '')}</li>`).join('');
  return `<section style="max-width:980px;margin:24px auto;padding:0 24px 24px;"><h2>Ingredient research hubs</h2><p>This product page now points to ingredient-first summaries without changing the product URL structure.</p><ul>${links}</ul></section>`;
}

function formatParagraphs(text) {
  return normalizeText(text).split(/\n\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n');
}

function formatIngredients(text) {
  const items = normalizeText(text).split(';').map(x => x.trim()).filter(Boolean);
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function formatCitations(citations) {
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
    .replace(/â/g, '—').replace(/â/g, '–').replace(/â/g, '’').replace(/â/g, '“').replace(/â/g, '”')
    .replace(/Ã¶/g, 'ö').replace(/Ã±/g, 'ñ').replace(/Ã©/g, 'é').replace(/Ã¼/g, 'ü').replace(/Ã-/g, 'í')
    .replace(/\x80\x94/g, '—').replace(/\x80/g, '').replace(/-/g, '—').replace(/-/g, '–')
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

function gradeToNumeric(grade) {
  return ({A:'5',B:'4',C:'3',D:'2'})[grade] || '4';
}

function baseHeaders(contentType) {
  return { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600, s-maxage=86400' };
}
function htmlHeaders(extra={}) { return { ...baseHeaders('text/html; charset=utf-8'), ...extra }; }
function textHeaders(extra={}) { return { ...baseHeaders('text/plain; charset=utf-8'), ...extra }; }
function notFound(msg) { return new Response(msg, { status: 404, headers: textHeaders() }); }
