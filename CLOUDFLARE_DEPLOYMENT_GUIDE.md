# Cloudflare Worker Deployment Guide

This guide covers deploying and maintaining the Supplement Intelligence Cloudflare Worker.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Manual Deployment (Cloudflare Dashboard)](#manual-deployment-cloudflare-dashboard)
3. [Automated Deployment (GitHub Actions)](#automated-deployment-github-actions)
4. [CLI Deployment (Wrangler)](#cli-deployment-wrangler)
5. [Google Search Console Setup](#google-search-console-setup)
6. [Troubleshooting](#troubleshooting)
7. [Verifying Deployment](#verifying-deployment)

---

## Quick Start

### Immediate Manual Update (Recommended for First Time)

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → Select your worker
3. Click **Edit Code** (Quick Edit)
4. Copy-paste contents from `worker.js` in this repository
5. Click **Save and Deploy**

---

## Manual Deployment (Cloudflare Dashboard)

### Step-by-Step Instructions

#### Step 1: Access Your Worker
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Log in to your account
3. Click **Workers & Pages** in the left sidebar
4. Find and click on **supplement-intelligence** worker

#### Step 2: Edit the Worker Code
1. Click the **Quick Edit** button (or "Edit Code")
2. This opens the code editor
3. Select all existing code (Ctrl+A / Cmd+A)
4. Open `worker.js` from this repository
5. Copy the entire contents
6. Paste into the Cloudflare editor (replacing all existing code)

#### Step 3: Save and Deploy
1. Click **Save and Deploy** button (top right)
2. Wait for the deployment to complete (usually 5-10 seconds)
3. The new code is now live!

#### Step 4: Verify
1. Visit https://www.supplement-intelligence.com/database
2. Should now return 200 OK instead of 404
3. Check all new database pages work

---

## Automated Deployment (GitHub Actions)

### Prerequisites
You need two secrets from Cloudflare:
- **API Token** with Workers edit permission
- **Account ID** 

### Step 1: Get Your Cloudflare Account ID
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on **Workers & Pages**
3. Look at the right sidebar under "Account details"
4. Copy the **Account ID**

### Step 2: Create a Cloudflare API Token
1. Go to [API Tokens page](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template
4. Click **Continue to summary** → **Create Token**
5. **Copy the token immediately** (it won't be shown again!)

### Step 3: Add Secrets to GitHub
1. Go to your repository: https://github.com/johnfoster1012-pixel/supplement-intelligence
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   | Secret Name | Value |
   |------------|-------|
   | `CLOUDFLARE_API_TOKEN` | Your API token from Step 2 |
   | `CLOUDFLARE_ACCOUNT_ID` | Your Account ID from Step 1 |

### Step 4: Trigger Deployment
Deployment happens automatically when you:
- Push changes to `worker.js` on the `main` branch
- Push changes to content files (database/, articles/, products/)
- Manually trigger via **Actions** tab → **Deploy Cloudflare Worker** → **Run workflow**

---

## CLI Deployment (Wrangler)

### Prerequisites
```bash
# Install wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### Deploy
```bash
cd /path/to/supplement-intelligence
wrangler deploy
```

### Local Development
```bash
# Start local development server
wrangler dev

# Opens at http://localhost:8787
```

---

## Google Search Console Setup

### Submit Sitemap
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property (supplement-intelligence.com)
3. Click **Sitemaps** in the left menu
4. Enter: `sitemap.xml`
5. Click **Submit**

### Request Indexing for New Pages
1. In Search Console, click **URL Inspection** in the left menu
2. Enter each new URL:
   - `https://www.supplement-intelligence.com/database`
   - `https://www.supplement-intelligence.com/database/ashwagandha-studies`
   - `https://www.supplement-intelligence.com/database/berberine-studies`
   - `https://www.supplement-intelligence.com/database/nac-studies`
3. Click **Request Indexing** for each URL
4. This accelerates Google discovering your new pages

### Verify Sitemap Contains New URLs
Your `sitemap.xml` should include:
```xml
<url>
  <loc>https://www.supplement-intelligence.com/database</loc>
  <lastmod>2024-01-15</lastmod>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://www.supplement-intelligence.com/database/ashwagandha-studies</loc>
  <lastmod>2024-01-15</lastmod>
  <priority>0.7</priority>
</url>
<!-- ... more database URLs -->
```

---

## Troubleshooting

### 404 Errors on Database Pages

**Cause:** Worker hasn't been updated with new routing logic.

**Solution:** 
1. Deploy the updated `worker.js` (see Manual Deployment above)
2. Wait 1-2 minutes for propagation
3. Clear browser cache and retry

### Worker Not Deploying via GitHub Actions

**Check:**
1. Secrets are correctly named (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
2. API Token has correct permissions (Edit Workers)
3. Account ID is correct (check Dashboard)

### Changes Not Appearing

**Try:**
1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. Check in incognito/private window
3. Wait 1-2 minutes for CDN propagation
4. Verify in Cloudflare Dashboard that deployment succeeded

### CORS Errors

**Cause:** Usually browser caching or CDN caching.

**Solution:**
1. Clear browser cache
2. In Cloudflare Dashboard, go to Caching → Purge Everything

### Wrangler Login Issues

```bash
# Clear existing credentials
wrangler logout

# Re-authenticate
wrangler login

# Or use environment variables
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
wrangler deploy
```

---

## Verifying Deployment

### Quick Health Check Script
```bash
#!/bin/bash
echo "Checking Supplement Intelligence deployment..."

URLS=(
  "https://www.supplement-intelligence.com/"
  "https://www.supplement-intelligence.com/database"
  "https://www.supplement-intelligence.com/database/ashwagandha-studies"
  "https://www.supplement-intelligence.com/database/berberine-studies"
  "https://www.supplement-intelligence.com/database/nac-studies"
)

for url in "${URLS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" = "200" ]; then
    echo "✅ $url - OK ($code)"
  else
    echo "❌ $url - FAILED ($code)"
  fi
done
```

### Manual Verification Checklist

- [ ] Homepage loads: https://www.supplement-intelligence.com/
- [ ] Database index loads: https://www.supplement-intelligence.com/database
- [ ] Ashwagandha page loads: https://www.supplement-intelligence.com/database/ashwagandha-studies
- [ ] Berberine page loads: https://www.supplement-intelligence.com/database/berberine-studies  
- [ ] NAC page loads: https://www.supplement-intelligence.com/database/nac-studies
- [ ] Old pages still work (e.g., /products/v-neurokafe)
- [ ] Sitemap accessible: https://www.supplement-intelligence.com/sitemap.xml

---

## File Reference

| File | Purpose |
|------|------|
| `worker.js` | Main Cloudflare Worker code |
| `wrangler.toml` | Wrangler CLI configuration |
| `.github/workflows/deploy-cloudflare-worker.yml` | GitHub Actions workflow |
| `sitemap.xml` | Search engine sitemap |
| `database/` | HTML files for study pages |

---

## Support

For issues with:
- **Cloudflare Workers**: [Cloudflare Community](https://community.cloudflare.com/)
- **Wrangler CLI**: [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- **GitHub Actions**: [GitHub Actions Docs](https://docs.github.com/en/actions)
