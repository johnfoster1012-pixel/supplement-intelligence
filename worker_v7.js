/**
 * Supplement Intelligence Worker v7
 * Serves HTML articles and dynamic product pages
 * Products are generated from JSON data + HTML template
 * Last updated: 2026-03-04
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/main/';

// Valid article slugs
const VALID_ARTICLE_SLUGS = new Set([
  'collagen-benefits', 'd-fenz-kids-benefits', 'genius-shake-kids-benefits',
  'lattekaffe-benefits', 'nourish-plus-benefits', 'nourish-plus-kids-benefits',
  'performance-plus-benefits', 's-balance-benefits', 'smartbiotics-kids-benefits',
  'v-asculax-benefits', 'v-control-benefits', 'v-curcumax-benefits',
  'v-daily-benefits', 'v-fortyflora-benefits', 'v-glutation-benefits',
  'v-itadol-benefits', 'v-italay-benefits', 'v-italboost-benefits',
  'v-itaren-benefits', 'v-lovkafe-benefits', 'v-neurokafe-benefits',
  'v-nitro-benefits', 'v-nrgy-benefits', 'v-omega3-benefits',
  'v-organex-benefits', 'v-tedetox-benefits', 'v-thermokafe-benefits',
  'vitalpro-benefits',
  // General informational articles
  'top-5-ingredients', 'dosage-side-effects'
]);

// Valid product slugs
const VALID_PRODUCT_SLUGS = new Set([
  'collagen', 'd-fenz-kids', 'genius-shake-kids', 'lattekaffe',
  'nourish-plus-kids', 'nourish-plus', 'performance-plus', 's-balance',
  'smartbiotics-kids', 'v-asculax', 'v-control', 'v-curcumax',
  'v-daily', 'v-fortyflora', 'v-glutation', 'v-itadol',
  'v-italay', 'v-italboost', 'v-itaren', 'v-lovkafe',
  'v-neurokafe', 'v-nitro', 'v-nrgy', 'v-omega3',
  'v-organex', 'v-tedetox', 'v-thermokafe', 'vitalpro'
]);

// Cache for template and data
let cachedTemplate = null;
let cachedProductsData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle articles: /articles/[slug] or /articles/[slug].html
  const articleMatch = path.match(/^\/articles\/([a-z0-9-]+?)(\.html)?$/);
  if (articleMatch) {
    return handleArticle(articleMatch[1]);
  }

  // Handle products: /products/[slug]
  const productMatch = path.match(/^\/products\/([a-z0-9-]+)$/);
  if (productMatch) {
    return handleProduct(productMatch[1]);
  }

  // Handle products index: /products or /products/
  if (path === '/products' || path === '/products/') {
    return handleProductsIndex();
  }

  // Handle articles index: /articles or /articles/
  if (path === '/articles' || path === '/articles/') {
    return handleArticlesIndex();
  }

  return new Response('Not Found', { status: 404 });
}

async function handleArticle(slug) {
  if (!VALID_ARTICLE_SLUGS.has(slug)) {
    return new Response('Article Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const githubUrl = GITHUB_RAW_BASE + 'articles/' + slug + '.html';

  try {
    const response = await fetch(githubUrl, {
      headers: { 'User-Agent': 'Supplement-Intelligence-Worker/7.0' },
      cf: { cacheTtl: 3600 }
    });

    if (!response.ok) {
      return new Response('Article temporarily unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const html = await response.text();

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Powered-By': 'Supplement Intelligence v7',
      }
    });
  } catch (err) {
    return new Response('Error fetching article: ' + err.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function handleProduct(slug) {
  if (!VALID_PRODUCT_SLUGS.has(slug)) {
    return new Response('Product Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // Load template and data (with caching)
    const [template, productsData] = await Promise.all([
      getTemplate(),
      getProductsData()
    ]);

    if (!template || !productsData) {
      return new Response('Unable to load product page resources', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const product = productsData.products[slug];
    if (!product) {
      return new Response('Product data not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Render the template with product data
    const html = renderProductPage(template, product);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Powered-By': 'Supplement Intelligence v7',
        'X-Product': slug
      }
    });
  } catch (err) {
    return new Response('Error rendering product page: ' + err.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function handleProductsIndex() {
  try {
    const productsData = await getProductsData();
    if (!productsData) {
      return new Response('Unable to load products', { status: 503 });
    }

    const html = renderProductsIndex(productsData);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Powered-By': 'Supplement Intelligence v7'
      }
    });
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

async function getTemplate() {
  const now = Date.now();
  if (cachedTemplate && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedTemplate;
  }

  try {
    const response = await fetch(GITHUB_RAW_BASE + 'product-template.html', {
      headers: { 'User-Agent': 'Supplement-Intelligence-Worker/7.0' },
      cf: { cacheTtl: 3600 }
    });

    if (response.ok) {
      cachedTemplate = await response.text();
      cacheTimestamp = now;
      return cachedTemplate;
    }
  } catch (err) {
    console.error('Failed to load template:', err);
  }

  return cachedTemplate; // Return stale cache if fetch fails
}

async function getProductsData() {
  const now = Date.now();
  if (cachedProductsData && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedProductsData;
  }

  try {
    const response = await fetch(GITHUB_RAW_BASE + 'products-data.json', {
      headers: { 'User-Agent': 'Supplement-Intelligence-Worker/7.0' },
      cf: { cacheTtl: 3600 }
    });

    if (response.ok) {
      cachedProductsData = await response.json();
      cacheTimestamp = now;
      return cachedProductsData;
    }
  } catch (err) {
    console.error('Failed to load products data:', err);
  }

  return cachedProductsData; // Return stale cache if fetch fails
}

function renderProductPage(template, product) {
  let html = template;

  // Basic replacements
  html = html.replace(/\{\{PRODUCT_NAME\}\}/g, escapeHtml(product.name));
  html = html.replace(/\{\{PRODUCT_SLUG\}\}/g, product.slug);
  html = html.replace(/\{\{PRODUCT_CATEGORY\}\}/g, product.category || 'General');
  html = html.replace(/\{\{PRODUCT_CATEGORY_DISPLAY\}\}/g, formatCategory(product.category));
  html = html.replace(/\{\{PRODUCT_INGREDIENTS\}\}/g, escapeHtml(product.ingredients));
  html = html.replace(/\{\{EVIDENCE_GRADE\}\}/g, product.evidenceGrade || 'B');
  html = html.replace(/\{\{EVIDENCE_GRADE_NUMERIC\}\}/g, gradeToNumeric(product.evidenceGrade));
  html = html.replace(/\{\{TOTAL_CITATIONS\}\}/g, product.totalCitations || product.citations.length);
  html = html.replace(/\{\{LAST_UPDATED\}\}/g, formatDate(product.lastUpdated));
  html = html.replace(/\{\{ARTICLE_URL\}\}/g, product.articleUrl || `/articles/${product.slug}-benefits`);

  // TL;DR - full and short versions
  const tldr = product.tldr || '';
  html = html.replace(/\{\{PRODUCT_TLDR\}\}/g, tldr);
  html = html.replace(/\{\{PRODUCT_TLDR_SHORT\}\}/g, truncateText(tldr, 160));

  // Research content - convert to paragraphs
  const research = product.research || '';
  const researchHtml = research.split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('\n');
  html = html.replace(/\{\{RESEARCH_CONTENT\}\}/g, researchHtml);

  // Mechanism
  const mechanism = product.mechanism || '';
  const cleanMechanism = mechanism.replace(/^The mechanism is:\s*/i, '');
  html = html.replace(/\{\{MECHANISM\}\}/g, cleanMechanism);

  // Ingredients list
  const ingredientsList = (product.ingredients || '')
    .split(',')
    .map(i => i.trim())
    .filter(i => i)
    .map(i => `<li class="ingredient-tag">${escapeHtml(i)}</li>`)
    .join('\n');
  html = html.replace(/\{\{INGREDIENTS_LIST\}\}/g, ingredientsList);

  // Citations list
  const citationsList = (product.citations || [])
    .map(c => `
      <li class="citation-item">
        <div class="citation-title">${escapeHtml(c.title)}</div>
        <span class="citation-pmid">
          PMID: <a href="https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/" target="_blank" rel="noopener">${c.pmid}</a>
        </span>
      </li>
    `)
    .join('\n');
  html = html.replace(/\{\{CITATIONS_LIST\}\}/g, citationsList);

  // FAQs list
  const faqsList = (product.faqs || [])
    .map((faq, i) => `
      <div class="faq-item${i === 0 ? ' open' : ''}">
        <div class="faq-question">${escapeHtml(faq.question)}</div>
        <div class="faq-answer">${faq.answer}</div>
      </div>
    `)
    .join('\n');
  html = html.replace(/\{\{FAQS_LIST\}\}/g, faqsList);

  // Related products
  const relatedProducts = (product.relatedProducts || [])
    .map(rp => `
      <a href="${rp.url}" class="related-card">
        <h4>${escapeHtml(rp.name.replace(/^.*?–\s*/, ''))}</h4>
      </a>
    `)
    .join('\n');
  html = html.replace(/\{\{RELATED_PRODUCTS\}\}/g, relatedProducts);

  return html;
}

function renderProductsIndex(productsData) {
  const products = Object.values(productsData.products);

  // Group by category
  const categories = {};
  products.forEach(p => {
    const cat = p.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  });

  let productCards = '';
  Object.entries(categories).sort().forEach(([category, prods]) => {
    productCards += `<h2 style="margin: 40px 0 20px; color: #1a3d2e;">${formatCategory(category)}</h2>`;
    productCards += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">';
    prods.forEach(p => {
      productCards += `
        <a href="/products/${p.slug}" style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; text-decoration: none; transition: box-shadow 0.2s, transform 0.2s;">
          <h3 style="color: #1a3d2e; margin: 0 0 8px; font-family: 'Cormorant Garamond', serif;">${escapeHtml(p.name)}</h3>
          <p style="color: #777; font-size: 0.9rem; margin: 0 0 12px;">${truncateText(p.tldr, 120)}</p>
          <span style="background: #e8f0ec; color: #1a3d2e; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">Grade ${p.evidenceGrade || 'B'}</span>
        </a>
      `;
    });
    productCards += '</div>';
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Products | Supplement Intelligence</title>
  <meta name="description" content="Evidence-based supplement reviews for ${products.length} Vital Health Global products with PubMed citations.">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Lora:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Lora', Georgia, serif; background: #faf8f5; color: #2a2a2a; margin: 0; padding: 0; line-height: 1.8; }
    a { text-decoration: none; }
    .header { background: #1a3d2e; padding: 18px 0; border-bottom: 4px solid #c4704a; }
    .header-inner { max-width: 1140px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }
    .logo { color: #fff; font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; }
    .logo span { color: #e8a082; }
    .nav a { color: rgba(255,255,255,0.85); margin-left: 24px; font-size: 0.95rem; }
    .container { max-width: 1140px; margin: 0 auto; padding: 40px 24px 60px; }
    h1 { font-family: 'Cormorant Garamond', serif; color: #1a3d2e; font-size: 2.5rem; margin: 0 0 12px; }
    .subtitle { color: #777; font-size: 1.1rem; }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="https://supplement-intelligence.com" class="logo">Supplement<span>Intelligence</span></a>
      <nav class="nav">
        <a href="https://supplement-intelligence.com">Home</a>
        <a href="https://supplement-intelligence.com/articles">Research</a>
        <a href="https://supplement-intelligence.com/products">Products</a>
      </nav>
    </div>
  </header>
  <div class="container">
    <h1>All Products</h1>
    <p class="subtitle">${products.length} evidence-based supplement reviews</p>
    ${productCards}
  </div>
</body>
</html>`;
}

// Helper functions
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function formatCategory(cat) {
  if (!cat) return 'General';
  return cat
    .split(/[\/\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' / ');
}

function formatDate(dateStr) {
  if (!dateStr) return '2026';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function gradeToNumeric(grade) {
  const grades = { 'A': '5', 'B': '4', 'C': '3', 'D': '2' };
  return grades[grade] || '4';
}

async function handleArticlesIndex() {
  const githubUrl = GITHUB_RAW_BASE + 'articles/index.html';

  try {
    const response = await fetch(githubUrl, {
      headers: { 'User-Agent': 'Supplement-Intelligence-Worker/7.0' },
      cf: { cacheTtl: 3600 }
    });

    if (!response.ok) {
      return new Response('Articles index temporarily unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const html = await response.text();

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Powered-By': 'Supplement Intelligence v7',
      }
    });
  } catch (err) {
    return new Response('Error fetching articles index: ' + err.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
