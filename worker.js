/**
 * Supplement Intelligence Articles Worker
 * Serves HTML articles stored in GitHub repository with JSON-LD structured data
 * Updated: 2026-03-04
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/main/articles/';
const SITE_DOMAIN = 'https://www.supplement-intelligence.com';

// All valid article slugs (28 product articles + 10 research articles)
const VALID_SLUGS = new Set([
  // Product benefit articles
  'v-neurokafe-benefits',
  'v-glutation-benefits',
  'collagen-benefits',
  'v-asculax-benefits',
  'v-control-benefits',
  'v-fortyflora-benefits',
  'v-curcumax-benefits',
  'v-omega3-benefits',
  'v-daily-benefits',
  'v-itadol-benefits',
  'v-italay-benefits',
  'v-italboost-benefits',
  'v-itaren-benefits',
  'v-lovkafe-benefits',
  'v-thermokafe-benefits',
  'lattekaffe-benefits',
  'v-nitro-benefits',
  'v-nrgy-benefits',
  'v-organex-benefits',
  'v-tedetox-benefits',
  'vitalpro-benefits',
  'performance-plus-benefits',
  'nourish-plus-benefits',
  's-balance-benefits',
  'd-fenz-kids-benefits',
  'genius-shake-kids-benefits',
  'smartbiotics-kids-benefits',
  'nourish-plus-kids-benefits'
]);

// Product metadata for JSON-LD generation
const PRODUCT_META = {
  'v-neurokafe-benefits': {
    name: 'V-NEUROKAFE',
    category: 'Cognitive Enhancement / Nootropics',
    description: 'Nootropic mushroom coffee with Lion\'s Mane, L-Theanine, Bacopa Monnieri for focus and mental clarity',
    studies: 11
  },
  'v-glutation-benefits': {
    name: 'V-GLUTATION',
    category: 'Antioxidant / Immune Support / Skin Health',
    description: 'Master antioxidant with reduced glutathione, Vitamin C, and Alpha Lipoic Acid',
    studies: 4
  },
  'collagen-benefits': {
    name: 'COLLAGEN COMPLEX',
    category: 'Skin Health / Joint Support',
    description: 'Multi-type collagen complex for skin, joints, and bone health',
    studies: 8
  },
  'v-omega3-benefits': {
    name: 'V-OMEGA3',
    category: 'Heart Health / Brain Health',
    description: 'Ultra-pure high-concentration EPA and DHA fish oil',
    studies: 12
  },
  'v-curcumax-benefits': {
    name: 'V-CURCUMAX',
    category: 'Anti-Inflammatory / Joint Health',
    description: 'Enhanced absorption curcumin for inflammation and joint support',
    studies: 9
  },
  'v-fortyflora-benefits': {
    name: 'V-FORTYFLORA',
    category: 'Gut Health / Immune Support',
    description: 'Multi-strain probiotic complex for digestive and immune health',
    studies: 7
  }
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Handle www redirect (non-www to www)
  if (url.hostname === 'supplement-intelligence.com') {
    return Response.redirect(`https://www.supplement-intelligence.com${path}`, 301);
  }
  
  // Serve static files
  if (path === '/sitemap.xml' || path === '/robots.txt' || path === '/feed.xml' || path === '/llms.txt') {
    const fileUrl = `https://raw.githubusercontent.com/johnfoster1012-pixel/supplement-intelligence/main${path}`;
    try {
      const response = await fetch(fileUrl, {
        headers: { 'User-Agent': 'Supplement-Intelligence-Worker/1.0' }
      });
      if (response.ok) {
        const content = await response.text();
        const contentType = path.endsWith('.xml') ? 'application/xml' : 'text/plain';
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': contentType + '; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    } catch (err) {
      // Fall through to 404
    }
  }
  
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
      headers: { 'User-Agent': 'Supplement-Intelligence-Worker/1.0' }
    });
    
    if (!response.ok) {
      return new Response('Article temporarily unavailable', { 
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    let html = await response.text();
    
    // Fix canonical URL to use www domain
    html = html.replace(
      /href="https:\/\/supplement-intelligence\.com/g,
      'href="https://www.supplement-intelligence.com'
    );
    
    // Inject JSON-LD structured data if not already present
    if (!html.includes('application/ld+json')) {
      const jsonLd = generateJsonLd(slug);
      html = html.replace('</head>', jsonLd + '\n</head>');
    }
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Powered-By': 'Supplement Intelligence',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    return new Response('Error fetching article: ' + err.message, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

function generateJsonLd(slug) {
  const meta = PRODUCT_META[slug] || {
    name: slug.replace(/-benefits$/, '').replace(/-/g, ' ').toUpperCase(),
    category: 'Health Supplement',
    description: 'Evidence-based supplement analysis',
    studies: 5
  };
  
  const articleUrl = `${SITE_DOMAIN}/articles/${slug}`;
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": articleUrl,
        "headline": `Complete Guide to ${meta.name}: Evidence-Based Analysis`,
        "description": meta.description,
        "author": {
          "@type": "Person",
          "name": "James Foster",
          "url": `${SITE_DOMAIN}/about`
        },
        "publisher": {
          "@type": "Organization",
          "name": "Supplement Intelligence",
          "url": SITE_DOMAIN,
          "logo": {
            "@type": "ImageObject",
            "url": `${SITE_DOMAIN}/images/logo.png`
          }
        },
        "datePublished": "2026-02-01",
        "dateModified": "2026-03-04",
        "mainEntityOfPage": articleUrl,
        "about": {
          "@type": "Product",
          "name": meta.name,
          "category": meta.category,
          "brand": {
            "@type": "Brand",
            "name": "Vital Health Global"
          }
        }
      },
      {
        "@type": "WebSite",
        "name": "Supplement Intelligence",
        "url": SITE_DOMAIN,
        "description": "Evidence-based supplement research with 242 PubMed citations"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_DOMAIN
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Research",
            "item": `${SITE_DOMAIN}/research`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": `Complete Guide to ${meta.name}`,
            "item": articleUrl
          }
        ]
      }
    ]
  };
  
  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}
