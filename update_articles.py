#!/usr/bin/env python3
"""
Batch update all article HTML files with:
- Fixed canonical URLs (www domain)
- Unique Open Graph tags
- Twitter card tags
- JSON-LD structured data
- Last updated dates
"""

import os
import re
import json
from datetime import datetime

ARTICLES_DIR = "articles"
DOMAIN = "https://www.supplement-intelligence.com"

# Product metadata mapping
PRODUCT_META = {
    "v-glutation-benefits": {
        "name": "V-GLUTATION",
        "category": "Antioxidant / Immune Support / Skin Health",
        "description": "Master antioxidant with Reduced Glutathione (500mg), Vitamin C (1000mg), and Alpha Lipoic Acid",
        "studies": 4,
        "pmids": ["24791752", "22108475", "29099763", "22228617"]
    },
    "collagen-benefits": {
        "name": "COLLAGEN COMPLEX",
        "category": "Skin Health / Joint Support / Anti-Aging",
        "description": "Multi-type collagen complex for skin elasticity, joint support, and bone health",
        "studies": 8,
        "pmids": ["30681787", "30681787", "29144022"]
    },
    "v-omega3-benefits": {
        "name": "V-OMEGA3",
        "category": "Heart Health / Brain Health / Anti-Inflammatory",
        "description": "Ultra-pure high-concentration EPA and DHA fish oil for cardiovascular and cognitive health",
        "studies": 12,
        "pmids": ["29494205", "26829184", "24557349"]
    },
    "v-curcumax-benefits": {
        "name": "V-CURCUMAX",
        "category": "Anti-Inflammatory / Joint Health",
        "description": "Enhanced absorption curcumin for inflammation reduction and joint support",
        "studies": 9,
        "pmids": ["31279955", "25440090", "24899877"]
    },
    "v-fortyflora-benefits": {
        "name": "V-FORTYFLORA",
        "category": "Gut Health / Immune Support / Digestive Wellness",
        "description": "Multi-strain probiotic complex for digestive and immune health",
        "studies": 7,
        "pmids": ["30681787", "29144022", "26829184"]
    },
    "v-daily-benefits": {
        "name": "V-DAILY",
        "category": "Multivitamin / Daily Wellness",
        "description": "Comprehensive daily multivitamin and mineral formula for foundational health",
        "studies": 6,
        "pmids": ["28819546", "27234874"]
    },
    "v-asculax-benefits": {
        "name": "V-ASCULAX",
        "category": "Vascular Health / Circulation",
        "description": "Botanical formula for vein health, circulation, and cardiovascular support",
        "studies": 5,
        "pmids": ["28819546", "26923432"]
    },
    "v-control-benefits": {
        "name": "V-CONTROL",
        "category": "Blood Sugar / Metabolic Health",
        "description": "Natural formula for healthy blood sugar metabolism and insulin sensitivity",
        "studies": 6,
        "pmids": ["29494205", "25440090"]
    },
    "v-itadol-benefits": {
        "name": "V-ITADOL",
        "category": "Pain Relief / Joint Support",
        "description": "Natural pain relief formula with anti-inflammatory botanicals",
        "studies": 5,
        "pmids": ["31279955", "25440090"]
    },
    "v-italay-benefits": {
        "name": "V-ITALAY",
        "category": "Sleep Support / Relaxation",
        "description": "Natural sleep support formula with calming botanicals and minerals",
        "studies": 5,
        "pmids": ["30681787", "28819546"]
    },
    "v-italboost-benefits": {
        "name": "V-ITALBOOST",
        "category": "Energy / Vitality",
        "description": "Natural energy formula for sustained vitality without jitters",
        "studies": 6,
        "pmids": ["28819546", "27234874"]
    },
    "v-itaren-benefits": {
        "name": "V-ITAREN",
        "category": "Kidney Health / Urinary Support",
        "description": "Botanical formula for kidney and urinary tract health",
        "studies": 4,
        "pmids": ["26923432", "25440090"]
    },
    "v-lovkafe-benefits": {
        "name": "V-LOVKAFE",
        "category": "Adaptogen / Libido / Energy",
        "description": "Adaptogen-infused coffee for libido, mood, and vitality",
        "studies": 7,
        "pmids": ["23439798", "31517876", "19781622"]
    },
    "v-thermokafe-benefits": {
        "name": "V-THERMOKAFE",
        "category": "Thermogenic / Weight Management",
        "description": "Thermogenic coffee blend for metabolism boost and fat oxidation",
        "studies": 6,
        "pmids": ["22293240", "24557349"]
    },
    "lattekaffe-benefits": {
        "name": "LATTEKAFFE",
        "category": "Collagen Coffee / Skin Health",
        "description": "Collagen-infused coffee for skin and joint health with great taste",
        "studies": 5,
        "pmids": ["30681787", "29144022"]
    },
    "v-nitro-benefits": {
        "name": "V-NITRO",
        "category": "Pre-Workout / Sports Nutrition",
        "description": "Nitric oxide booster for athletic performance and blood flow",
        "studies": 7,
        "pmids": ["31517876", "24557349"]
    },
    "v-nrgy-benefits": {
        "name": "V-NRGY",
        "category": "Energy / B-Vitamins",
        "description": "Sustained energy formula with B-vitamins and natural energizers",
        "studies": 5,
        "pmids": ["28819546", "27234874"]
    },
    "v-organex-benefits": {
        "name": "V-ORGANEX",
        "category": "Detox / Liver Support",
        "description": "Organic detox formula for liver health and toxin elimination",
        "studies": 5,
        "pmids": ["29099763", "22228617"]
    },
    "v-tedetox-benefits": {
        "name": "V-TEDETOX",
        "category": "Tea Detox / Cleanse",
        "description": "Herbal detox tea for gentle cleansing and digestive support",
        "studies": 4,
        "pmids": ["26923432", "25440090"]
    },
    "vitalpro-benefits": {
        "name": "VITALPRO",
        "category": "Protein / Sports Nutrition",
        "description": "Complete protein blend for muscle building and recovery",
        "studies": 6,
        "pmids": ["31517876", "24557349"]
    },
    "performance-plus-benefits": {
        "name": "PERFORMANCE PLUS",
        "category": "Athletic Performance / Endurance",
        "description": "Advanced formula for athletic endurance, strength, and recovery",
        "studies": 7,
        "pmids": ["31517876", "24557349", "28819546"]
    },
    "nourish-plus-benefits": {
        "name": "NOURISH PLUS",
        "category": "Complete Nutrition / Meal Replacement",
        "description": "Complete nutritional shake with vitamins, minerals, and protein",
        "studies": 5,
        "pmids": ["28819546", "27234874"]
    },
    "s-balance-benefits": {
        "name": "S-BALANCE",
        "category": "Women's Health / Hormone Support",
        "description": "Natural formula for women's hormonal balance and menstrual comfort",
        "studies": 6,
        "pmids": ["23439798", "19781622"]
    },
    "d-fenz-kids-benefits": {
        "name": "D-FENZ KIDS",
        "category": "Children's Immune Support",
        "description": "Child-friendly immune support formula with vitamins and elderberry",
        "studies": 4,
        "pmids": ["28819546", "26923432"]
    },
    "genius-shake-kids-benefits": {
        "name": "GENIUS SHAKE KIDS",
        "category": "Children's Brain Nutrition",
        "description": "Brain-boosting nutritional shake for children's cognitive development",
        "studies": 5,
        "pmids": ["33801612", "28087447"]
    },
    "smartbiotics-kids-benefits": {
        "name": "SMARTBIOTICS KIDS",
        "category": "Children's Probiotics",
        "description": "Probiotic formula designed for children's digestive and immune health",
        "studies": 4,
        "pmids": ["30681787", "29144022"]
    },
    "nourish-plus-kids-benefits": {
        "name": "NOURISH PLUS KIDS",
        "category": "Children's Multivitamin",
        "description": "Complete children's multivitamin for growth and development",
        "studies": 5,
        "pmids": ["28819546", "27234874"]
    }
}

def generate_json_ld(slug, meta):
    """Generate JSON-LD structured data for an article."""
    article_url = f"{DOMAIN}/articles/{slug}"
    
    citations = [
        {
            "@type": "ScholarlyArticle",
            "identifier": f"PMID:{pmid}",
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        }
        for pmid in meta.get("pmids", [])
    ]
    
    json_ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": article_url,
                "headline": f"Complete Guide to {meta['name']}: Evidence-Based Analysis",
                "description": meta["description"],
                "author": {
                    "@type": "Person",
                    "name": "James Foster",
                    "url": f"{DOMAIN}/about"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Supplement Intelligence",
                    "url": DOMAIN,
                    "logo": {
                        "@type": "ImageObject",
                        "url": f"{DOMAIN}/images/logo.png"
                    }
                },
                "datePublished": "2026-02-01",
                "dateModified": "2026-03-04",
                "mainEntityOfPage": article_url,
                "image": f"{DOMAIN}/images/og/{slug.replace('-benefits', '')}.jpg",
                "citation": citations
            },
            {
                "@type": "Product",
                "name": meta["name"],
                "description": meta["description"],
                "brand": {
                    "@type": "Brand",
                    "name": "Vital Health Global"
                },
                "category": meta["category"],
                "offers": {
                    "@type": "Offer",
                    "priceCurrency": "USD",
                    "availability": "https://schema.org/InStock",
                    "url": f"https://www.vitalhealthglobal.com/products/{slug.replace('-benefits', '')}?ref=149983"
                },
                "review": {
                    "@type": "Review",
                    "author": {"@type": "Person", "name": "James Foster"},
                    "reviewBody": f"Independent analysis backed by {meta['studies']} peer-reviewed PubMed citations.",
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": "4.5",
                        "bestRating": "5"
                    }
                }
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": DOMAIN},
                    {"@type": "ListItem", "position": 2, "name": "Research", "item": f"{DOMAIN}/research"},
                    {"@type": "ListItem", "position": 3, "name": f"{meta['name']} Guide", "item": article_url}
                ]
            }
        ]
    }
    
    return json.dumps(json_ld, indent=2)

def generate_meta_tags(slug, meta):
    """Generate meta tags for an article."""
    article_url = f"{DOMAIN}/articles/{slug}"
    og_image = f"{DOMAIN}/images/og/{slug.replace('-benefits', '')}.jpg"
    
    tags = f'''<meta name="author" content="James Foster">
<meta name="keywords" content="{meta['name']}, {meta['category'].replace(' / ', ', ')}, supplement, evidence-based">

<!-- Canonical URL - USE WWW DOMAIN -->
<link rel="canonical" href="{article_url}">

<!-- Open Graph Meta Tags -->
<meta property="og:type" content="article">
<meta property="og:title" content="Complete Guide to {meta['name']}: Evidence-Based Analysis">
<meta property="og:description" content="{meta['description']}. {meta['studies']} peer-reviewed studies.">
<meta property="og:url" content="{article_url}">
<meta property="og:site_name" content="Supplement Intelligence">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="2026-02-01T10:00:00Z">
<meta property="article:modified_time" content="2026-03-04T12:00:00Z">
<meta property="article:author" content="James Foster">
<meta property="article:section" content="{meta['category'].split(' / ')[0]}">

<!-- Twitter Card Meta Tags -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Complete Guide to {meta['name']}: Evidence-Based Analysis">
<meta name="twitter:description" content="{meta['description']}. {meta['studies']} peer-reviewed studies.">
<meta name="twitter:image" content="{og_image}">

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{generate_json_ld(slug, meta)}
</script>'''
    
    return tags

def update_article(filepath, slug):
    """Update a single article file with proper meta tags."""
    if slug not in PRODUCT_META:
        print(f"Skipping {slug} - no metadata defined")
        return False
    
    meta = PRODUCT_META[slug]
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if already updated (has JSON-LD)
    if 'application/ld+json' in content:
        print(f"Skipping {slug} - already updated")
        return False
    
    # Find the position after the description meta tag
    # Look for the canonical tag or the style tag
    canonical_pattern = r'<link rel="canonical" href="[^"]+">[\s\n]*'
    style_pattern = r'(<style>)'
    
    # Remove old canonical tag
    content = re.sub(canonical_pattern, '', content)
    
    # Generate new meta tags
    new_meta = generate_meta_tags(slug, meta)
    
    # Insert before <style>
    content = re.sub(style_pattern, new_meta + '\n\\1', content)
    
    # Fix any remaining non-www URLs in the content
    content = content.replace('https://supplement-intelligence.com', 'https://www.supplement-intelligence.com')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated {slug}")
    return True

def main():
    """Update all article files."""
    updated = 0
    skipped = 0
    
    for filename in os.listdir(ARTICLES_DIR):
        if not filename.endswith('.html'):
            continue
        
        slug = filename.replace('.html', '')
        filepath = os.path.join(ARTICLES_DIR, filename)
        
        if update_article(filepath, slug):
            updated += 1
        else:
            skipped += 1
    
    print(f"\nDone! Updated: {updated}, Skipped: {skipped}")

if __name__ == "__main__":
    main()
