# Evidence verification method

## Source hierarchy
1. Human clinical research and systematic reviews/meta-analyses.
2. PubMed/NCBI bibliographic records for citation verification.
3. NIH Office of Dietary Supplements, NCCIH, FDA, LiverTox/NCBI and comparable authoritative sources for safety or regulatory context.
4. Current manufacturer labels/pages for formulation facts only.

## Required fields
Every published study record should include:
- stable identifier (PMID/DOI)
- title, authors, journal, year
- study type
- human / animal / in-vitro
- sample size and population
- ingredient and exact form
- dose and dosing schedule
- duration and comparator
- primary outcome and result
- adverse events/safety findings
- product-form match
- product-dose match
- evidence directness: direct / indirect / mechanistic
- verification date and status

## Review-level evidence summaries

For high-level evidence synthesis, an ingredient record may include a `review_evidence` array. Each entry summarizes one systematic review, meta-analysis, umbrella review, or similarly high-level human evidence source.

Required review-level fields:
- title
- PMID
- study type
- population or review scope
- evidence scope/outcome
- main finding
- important limitations
- evidence directness
- verification date
- stable source URL

A review-level summary is not a substitute for a full trial record. Do not infer an exact dose, formulation, duration, comparator, adverse-event profile, or finished-product effect unless the reviewed source explicitly supports that detail.

Positive pooled findings must be reported together with clinically relevant limitations such as heterogeneity, small-study effects, preparation differences, subgroup dependence, or low certainty.

## Evidence levels
- Direct human evidence
- Relevant human evidence
- Preliminary human evidence
- Mechanistic evidence

Do not call this system GRADE unless a formal GRADE assessment is actually performed.

## Publication rule
A valid citation is not automatically a valid claim citation. The study must support the specific statement being made.
