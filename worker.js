/**
 * Supplement Intelligence Articles Worker
 * Serves HTML articles stored in GitHub repository
 * All 27 product articles now live
 * Last updated: 2026-03-04T19:30:00.000Z
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/main/articles/';

const VALID_SLUGS = new Set([
  'collagen-benefits',
  'd-fenz-kids-benefits',
  'genius-shake-kids-benefits',
  'lattekaffe-benefits',
  'nourish-plus-benefits',
  'nourish-plus-kids-benefits',
  'performance-plus-benefits',
  's-balance-benefits',
  'smartbiotics-kids-benefits',
  'v-asculax-benefits',
  'v-control-benefits',
  'v-curcumax-benefits',
  'v-daily-benefits',
  'v-fortyflora-benefits',
  'v-glutation-benefits',
  'v-itadol-benefits',
  'v-italay-benefits',
  'v-italboost-benefits',
  'v-itaren-benefits',
  'v-lovkafe-benefits',
  'v-nitro-benefits',
  'v-nrgy-benefits',
  'v-omega3-benefits',
  'v-organex-benefits',
  'v-tedetox-benefits',
  'v-thermokafe-benefits',
  'vitalpro-benefits'
]);

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Handle /articles/[slug] or /articles/[slug].html
  const match = path.match(/^\/articles\/([a-z0-9-]+?)(\.html)?$/);
  
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }
  
  const slug = match[1];
  
  if (!VALID_SLUGS.has(slug)) {
    return new Response('Article Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Fetch from GitHub raw
  const githubUrl = GITHUB_RAW_BASE + slug + '.html';
  
  try {
    const response = await fetch(githubUrl, {
      headers: { 'User-Agent': 'Supplement-Intelligence-Worker/1.0' },
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
        'X-Powered-By': 'Supplement Intelligence',
      }
    });
  } catch (err) {
    return new Response('Error fetching article: ' + err.message, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
