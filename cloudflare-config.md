# Cloudflare Configuration for Supplement Intelligence

## Required Setup for Domain Redirect and Pre-rendering

### 1. Fix Non-WWW to WWW Redirect

In Cloudflare Dashboard, go to **Rules > Redirect Rules** and create the following rule:

**Rule Name:** Non-www to www redirect

**When incoming requests match:**
- Hostname equals `supplement-intelligence.com`

**Then:**
- Type: Dynamic
- Expression: `concat("https://www.supplement-intelligence.com", http.request.uri.path)`
- Status code: 301 (Permanent Redirect)
- Preserve query string: Yes

### 2. Alternative: Page Rules Method

If using Page Rules instead:

1. Go to **Rules > Page Rules**
2. Create a new rule:
   - URL pattern: `supplement-intelligence.com/*`
   - Setting: Forwarding URL
   - Status Code: 301 - Permanent Redirect
   - Destination URL: `https://www.supplement-intelligence.com/$1`

### 3. DNS Configuration

Ensure both domains resolve:

| Type | Name | Content |
|------|------|---------|
| CNAME | www | your-hosting-provider |
| CNAME | @ (root) | your-hosting-provider |

Or with Cloudflare Pages:
| Type | Name | Content |
|------|------|---------|
| CNAME | www | your-project.pages.dev |
| CNAME | @ (root) | your-project.pages.dev |

### 4. Deploy the Worker

The `worker.js` file in this repository handles:
- Serving articles from GitHub
- Injecting JSON-LD structured data
- Fixing canonical URLs
- Non-www to www redirect

To deploy:
1. Go to **Workers & Pages**
2. Create new Worker
3. Paste the contents of `worker.js`
4. Add route: `*supplement-intelligence.com/articles/*`

### 5. Pre-rendering Configuration for AI Crawlers

For AI crawler accessibility, configure Cloudflare to serve pre-rendered HTML. Options:

#### Option A: Use Cloudflare Workers for Bot Detection

Add this to your worker.js:

```javascript
const BOT_USER_AGENTS = [
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot',
  'gptbot', 'chatgpt-user', 'claude-web', 'perplexitybot',
  'anthropic-ai', 'google-extended'
];

function isBot(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}
```

#### Option B: Use Prerender.io Integration

1. Sign up at prerender.io
2. Get your API token
3. Add the Prerender integration via Cloudflare Apps or Worker

### 6. Cache Configuration

Set these caching rules for optimal performance:

**For articles (HTML):**
- Browser TTL: 1 hour
- Edge TTL: 24 hours

**For static assets (sitemap.xml, robots.txt, feed.xml):**
- Browser TTL: 4 hours
- Edge TTL: 24 hours

### 7. Security Headers

The worker adds these headers automatically:
- `X-Content-Type-Options: nosniff`
- `X-Powered-By: Supplement Intelligence`

### 8. SSL/TLS Configuration

Ensure SSL is set to **Full (Strict)** for security.

---

## Verification Checklist

After deployment, verify:

- [ ] `https://supplement-intelligence.com` redirects to `https://www.supplement-intelligence.com`
- [ ] All article pages load correctly
- [ ] JSON-LD structured data appears in page source
- [ ] sitemap.xml is accessible at `https://www.supplement-intelligence.com/sitemap.xml`
- [ ] robots.txt is accessible
- [ ] feed.xml is accessible
- [ ] llms.txt is accessible

## Testing AI Crawler Access

Use these tools to verify AI discoverability:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- Bing Webmaster Tools
- Screaming Frog SEO Spider

## Support

For issues with this configuration, contact: research@supplement-intelligence.com
