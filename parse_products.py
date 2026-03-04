#!/usr/bin/env python3
"""
Parse all product markdown files and create a structured JSON data file.
"""

import os
import re
import json
import yaml

PRODUCTS_DIR = '/home/ubuntu/supplement-intelligence/products'
OUTPUT_FILE = '/home/ubuntu/supplement-intelligence/products-data.json'

def extract_frontmatter(content):
    """Extract YAML frontmatter from markdown."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        try:
            fm = yaml.safe_load(match.group(1))
            remaining = content[match.end():]
            return fm or {}, remaining
        except:
            return {}, content
    return {}, content

def extract_section(content, header_pattern, next_header_level=2):
    """Extract content between a header and the next same-level header."""
    pattern = rf'^#{{{next_header_level}}}\s+{header_pattern}\s*$'
    match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
    if not match:
        return None
    
    start = match.end()
    # Find next h2 header
    next_h2 = re.search(r'^##\s+', content[start:], re.MULTILINE)
    if next_h2:
        end = start + next_h2.start()
    else:
        end = len(content)
    
    return content[start:end].strip()

def extract_tldr(content):
    """Extract TL;DR section."""
    return extract_section(content, r'TL;DR')

def extract_research(content):
    """Extract What Does The Research Say? section."""
    return extract_section(content, r'What Does The Research Say\?')

def extract_mechanism(content):
    """Extract Mechanism of Action section."""
    return extract_section(content, r'Mechanism of Action')

def extract_evidence_grade(content):
    """Extract Evidence Grade section."""
    text = extract_section(content, r'Evidence Grade')
    if not text:
        return None, None
    
    # Extract grade (A, B, C, etc.)
    grade_match = re.search(r'Grade\s+([A-D])', text)
    grade = grade_match.group(1) if grade_match else None
    return grade, text

def extract_faqs(content):
    """Extract FAQ section and parse Q&A pairs."""
    section = extract_section(content, r'Frequently Asked Questions')
    if not section:
        return []
    
    faqs = []
    # Pattern for **Q: question**
    qa_pattern = r'\*\*Q:\s*(.*?)\*\*\s*\n+A:\s*(.*?)(?=\n\n\*\*Q:|\Z)'
    matches = re.findall(qa_pattern, section, re.DOTALL)
    for q, a in matches:
        faqs.append({
            'question': q.strip(),
            'answer': a.strip()
        })
    return faqs

def extract_citations(content):
    """Extract PubMed citations."""
    section = extract_section(content, r'PubMed Citations')
    if not section:
        return []
    
    citations = []
    # Pattern: numbered items with PMID
    pattern = r'\d+\.\s+\*\*(.*?)\*\*.*?PMID:\s*\[(\d+)\]'
    matches = re.findall(pattern, section, re.DOTALL)
    for title, pmid in matches:
        citations.append({
            'title': title.strip().replace(' â ', ' - ').replace('â', '-'),
            'pmid': pmid
        })
    return citations

def extract_related_products(content):
    """Extract related products links."""
    section = extract_section(content, r'Related Products')
    if not section:
        return []
    
    products = []
    # Pattern: [Name](/products/slug)
    pattern = r'\[([^\]]+)\]\((/products/[a-z0-9-]+)\)'
    matches = re.findall(pattern, section)
    for name, url in matches:
        products.append({
            'name': name.strip(),
            'url': url.strip()
        })
    return products

def extract_pmid_links(text):
    """Extract all PMID links from text."""
    pattern = r'\[PMID\s*(\d+)\]\(https://pubmed\.ncbi\.nlm\.nih\.gov/(\d+)/?\)'
    return list(set(re.findall(pattern, text)))

def clean_markdown_for_html(text):
    """Convert markdown text to cleaner form for display."""
    if not text:
        return ''
    
    # Convert PMID links to readable format
    text = re.sub(
        r'\[PMID\s*(\d+)\]\(https://pubmed\.ncbi\.nlm\.nih\.gov/\d+/?\)',
        r'(PMID: \1)',
        text
    )
    
    # Convert bold
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    
    # Convert italic
    text = re.sub(r'\*([^\*]+)\*', r'<em>\1</em>', text)
    
    # Handle special characters
    text = text.replace('â', '-')
    text = text.replace('â€"', '-')
    text = text.replace('Î±', 'α')
    text = text.replace('Î²', 'β')
    text = text.replace('Îº', 'κ')
    text = text.replace('Î³', 'γ')
    text = text.replace('â‰¥', '≥')
    text = text.replace('â¤', '≤')
    
    return text.strip()

def parse_product_file(filepath):
    """Parse a single product markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter, body = extract_frontmatter(content)
    
    # Extract slug from filename
    filename = os.path.basename(filepath)
    slug = filename.replace('.md', '')
    
    # Get product name from frontmatter or filename
    name = frontmatter.get('title', slug.upper().replace('-', ' '))
    
    # Extract sections
    tldr = extract_tldr(body)
    research = extract_research(body)
    mechanism = extract_mechanism(body)
    grade, grade_text = extract_evidence_grade(body)
    faqs = extract_faqs(body)
    citations = extract_citations(body)
    related = extract_related_products(body)
    
    # Count all PMIDs in document
    all_pmids = extract_pmid_links(body)
    
    product = {
        'slug': slug,
        'name': name,
        'url': f'/products/{slug}',
        'ingredients': frontmatter.get('ingredients', ''),
        'category': frontmatter.get('category', ''),
        'lastUpdated': frontmatter.get('last_updated', ''),
        'tldr': clean_markdown_for_html(tldr),
        'research': clean_markdown_for_html(research),
        'mechanism': clean_markdown_for_html(mechanism),
        'evidenceGrade': grade,
        'evidenceGradeText': clean_markdown_for_html(grade_text),
        'faqs': faqs,
        'citations': citations,
        'relatedProducts': related,
        'totalCitations': len(set([p[1] for p in all_pmids])),
        'articleUrl': f'/articles/{slug}-benefits'
    }
    
    return product

def main():
    products = []
    
    for filename in sorted(os.listdir(PRODUCTS_DIR)):
        if filename.endswith('.md'):
            filepath = os.path.join(PRODUCTS_DIR, filename)
            print(f'Parsing: {filename}')
            try:
                product = parse_product_file(filepath)
                products.append(product)
            except Exception as e:
                print(f'  Error parsing {filename}: {e}')
    
    # Create output
    output = {
        'generatedAt': '2026-03-04T00:00:00Z',
        'totalProducts': len(products),
        'products': {p['slug']: p for p in products}
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f'\nGenerated {OUTPUT_FILE} with {len(products)} products')
    
    # Print summary
    total_citations = sum(p['totalCitations'] for p in products)
    print(f'Total citations across all products: {total_citations}')

if __name__ == '__main__':
    main()
