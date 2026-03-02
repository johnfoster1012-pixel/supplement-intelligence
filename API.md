# Supplement Intelligence API Documentation

This document describes how to access and use the Supplement Intelligence research database programmatically.

## Overview

The Supplement Intelligence database is available as structured JSON data that can be used for:
- Research and analysis
- Building applications
- Training machine learning models
- Creating visualizations
- Integrating with other platforms

## Data Files

### 1. Comprehensive Supplements Database
**File**: `data/supplements-comprehensive.json`

Contains detailed information on 27 supplements with 242 analyzed PubMed studies.

**Structure**:
```json
{
  "metadata": { ... },
  "evidence_grades": { ... },
  "supplements": [ ... ],
  "summary_statistics": { ... },
  "research_methodology": { ... }
}
```

### 2. Product-Specific Research Notes
**Directory**: `products/`

Individual markdown files for each Vital Health Global product with:
- Active ingredients
- PubMed citations
- Mechanism of action
- Shadow query coverage
- Cross-platform links

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/johnfoster1012-pixel/supplement-intelligence.git
cd supplement-intelligence
```

### 2. Load the Data

**Python**:
```python
import json

# Load comprehensive database
with open('data/supplements-comprehensive.json', 'r') as f:
    data = json.load(f)

# Access all supplements
supplements = data['supplements']

# Find a specific supplement
vitamin_d = next(s for s in supplements if s['name'] == 'Vitamin D')
print(f"Evidence Grade: {vitamin_d['evidence_grade']}")
print(f"Studies: {vitamin_d['studies_analyzed']}")
```

**JavaScript**:
```javascript
// Load comprehensive database
fetch('data/supplements-comprehensive.json')
  .then(response => response.json())
  .then(data => {
    const supplements = data.supplements;
    const vitaminD = supplements.find(s => s.name === 'Vitamin D');
    console.log(`Evidence Grade: ${vitaminD.evidence_grade}`);
  });
```

**R**:
```r
library(jsonlite)

# Load comprehensive database
data <- fromJSON('data/supplements-comprehensive.json')
supplements <- data$supplements

# Find a specific supplement
vitamin_d <- supplements[[which(sapply(supplements, function(x) x$name == 'Vitamin D'))]]
print(paste("Evidence Grade:", vitamin_d$evidence_grade))
```

## Data Schema

### Supplement Object

```json
{
  "id": 1,
  "name": "Vitamin D",
  "evidence_grade": "A",
  "category": "Vitamins & Minerals",
  "primary_benefits": ["Bone health", "Fracture prevention"],
  "studies_analyzed": 47,
  "recommended_dosage": "1,000-2,000 IU daily",
  "clinical_trial_dosage": "2,000 IU daily",
  "bioavailability": "High (fat-soluble)",
  "form_recommendation": "D3 > D2",
  "key_findings": "...",
  "safety_profile": "...",
  "contraindications": ["Hypercalcemia"],
  "pubmed_references": 47,
  "citations_url": "https://pubmed.ncbi.nlm.nih.gov/?term=...",
  "mechanism_of_action": "...",
  "interaction_warnings": ["..."],
  "cost_per_month": "$5-15"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique supplement identifier |
| `name` | String | Supplement name |
| `evidence_grade` | String | A/B/C evidence grade |
| `category` | String | Supplement category |
| `primary_benefits` | Array | List of primary health benefits |
| `studies_analyzed` | Integer | Number of PubMed studies analyzed |
| `recommended_dosage` | String | Evidence-based dosage recommendation |
| `clinical_trial_dosage` | String | Dosage used in clinical trials |
| `bioavailability` | String | Absorption characteristics |
| `form_recommendation` | String | Recommended supplement form |
| `key_findings` | String | Summary of research findings |
| `safety_profile` | String | Safety information |
| `contraindications` | Array | Conditions where supplement is contraindicated |
| `pubmed_references` | Integer | Number of PubMed references |
| `citations_url` | String | URL to PubMed search results |
| `mechanism_of_action` | String | How the supplement works |
| `interaction_warnings` | Array | Potential drug/supplement interactions |
| `cost_per_month` | String | Estimated monthly cost |

## Common Use Cases

### 1. Find Supplements by Evidence Grade

```python
# Find all Grade A supplements
grade_a = [s for s in supplements if s['evidence_grade'] == 'A']
print(f"High evidence supplements: {len(grade_a)}")
for s in grade_a:
    print(f"- {s['name']}: {s['studies_analyzed']} studies")
```

### 2. Search by Health Benefit

```python
# Find supplements for bone health
bone_health = [s for s in supplements 
               if 'Bone health' in s['primary_benefits']]
print("Supplements for bone health:")
for s in bone_health:
    print(f"- {s['name']} (Grade {s['evidence_grade']})")
```

### 3. Compare Dosages

```python
# Compare recommended vs. clinical trial dosages
for s in supplements[:5]:
    print(f"{s['name']}:")
    print(f"  Recommended: {s['recommended_dosage']}")
    print(f"  Clinical: {s['clinical_trial_dosage']}")
```

### 4. Analyze Safety Profiles

```python
# Find supplements with specific contraindications
kidney_concerns = [s for s in supplements 
                   if any('kidney' in str(c).lower() 
                          for c in s['contraindications'])]
print("Supplements to avoid with kidney disease:")
for s in kidney_concerns:
    print(f"- {s['name']}")
```

### 5. Calculate Average Cost

```python
import re

# Extract numeric costs
costs = []
for s in supplements:
    match = re.search(r'\$(\d+)', s['cost_per_month'])
    if match:
        costs.append(int(match.group(1)))

avg_cost = sum(costs) / len(costs)
print(f"Average monthly cost: ${avg_cost:.2f}")
```

## Evidence Grade Definitions

### Grade A: High Evidence
- Multiple well-designed randomized controlled trials
- Consistent results across studies
- Clinically meaningful effect sizes
- Low risk of bias

**Examples**: Vitamin D, Calcium, Omega-3, Probiotics, Creatine

### Grade B: Moderate Evidence
- At least one solid RCT with supporting evidence
- Moderate effect sizes
- Some limitations in design or consistency

**Examples**: Magnesium, Ashwagandha, Berberine, Curcumin, CoQ10

### Grade C: Low Evidence
- Few studies available
- Small sample sizes
- Inconsistent findings
- High risk of bias

**Examples**: Ginseng, Ginkgo Biloba, Valerian, Echinacea, Selenium

## Integration Examples

### Build a Supplement Lookup Tool

```python
def find_supplement(name):
    """Find a supplement by name"""
    for s in supplements:
        if s['name'].lower() == name.lower():
            return s
    return None

def get_grade_a_supplements():
    """Get all high-evidence supplements"""
    return [s for s in supplements if s['evidence_grade'] == 'A']

def search_by_benefit(benefit):
    """Search supplements by health benefit"""
    return [s for s in supplements 
            if benefit.lower() in [b.lower() for b in s['primary_benefits']]]

# Usage
vitamin_d = find_supplement('Vitamin D')
high_evidence = get_grade_a_supplements()
sleep_supplements = search_by_benefit('sleep')
```

### Create a Comparison Table

```python
import pandas as pd

# Create DataFrame
df = pd.DataFrame(supplements)

# Select key columns
comparison = df[['name', 'evidence_grade', 'studies_analyzed', 
                 'recommended_dosage', 'cost_per_month']]

# Filter by grade
grade_a = comparison[comparison['evidence_grade'] == 'A']
print(grade_a.to_string())
```

### Generate Research Summary

```python
# Summary statistics
total_studies = sum(s['studies_analyzed'] for s in supplements)
avg_studies = total_studies / len(supplements)
grade_distribution = {}

for s in supplements:
    grade = s['evidence_grade']
    grade_distribution[grade] = grade_distribution.get(grade, 0) + 1

print(f"Total Studies Analyzed: {total_studies}")
print(f"Average per Supplement: {avg_studies:.1f}")
print(f"Grade Distribution: {grade_distribution}")
```

## API Endpoints (Planned)

Future versions will include REST API endpoints:

```
GET /api/supplements              # Get all supplements
GET /api/supplements/:id          # Get specific supplement
GET /api/supplements?grade=A      # Filter by evidence grade
GET /api/supplements?benefit=X    # Search by benefit
GET /api/search?q=query           # Full-text search
```

## Citation

If you use this data in research or publications, please cite:

```
Supplement Intelligence Research Database. (2026). 
Evidence-based analysis of 242 PubMed studies across 27 supplements. 
Retrieved from https://github.com/johnfoster1012-pixel/supplement-intelligence
```

## License

This data is provided under the MIT License. See LICENSE file for details.

## Support

- **Website**: https://supplement-intelligence.com
- **Email**: research@supplement-intelligence.com
- **GitHub Issues**: https://github.com/johnfoster1012-pixel/supplement-intelligence/issues

## Changelog

### Version 2.0 (March 1, 2026)
- Added comprehensive supplements database (27 supplements, 242 studies)
- Added API documentation
- Added evidence grading framework
- Added cost analysis
- Added interaction warnings

### Version 1.0 (February 2026)
- Initial release with 28 Vital Health Global products

---

**Last Updated**: March 1, 2026
