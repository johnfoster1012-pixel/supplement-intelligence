#!/usr/bin/env python3
"""Validate Supplement Intelligence current product and evidence data.

This script does not generate medical claims or product formulations.
It checks internal consistency between products-data.json and the
product-label verification ledger.
"""

from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parent
PRODUCTS_FILE = ROOT / "products-data.json"
LEDGER_FILE = ROOT / "data" / "product-label-verification.json"
EVIDENCE_FILE = ROOT / "ingredient-evidence.json"


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main():
    errors = []

    products_doc = load_json(PRODUCTS_FILE)
    ledger_doc = load_json(LEDGER_FILE)
    evidence_doc = load_json(EVIDENCE_FILE)

    products = products_doc.get("products", {})
    ledger = {
        row.get("product_slug"): row
        for row in ledger_doc.get("products", [])
        if row.get("product_slug")
    }

    if products_doc.get("totalProducts") != len(products):
        errors.append("products-data.json totalProducts does not match product count")

    if len(products) != 31:
        errors.append(f"expected 31 current catalog products, found {len(products)}")

    for slug, product in products.items():
        row = ledger.get(slug)
        if not row:
            errors.append(f"{slug}: missing label-verification ledger row")
            continue

        status = row.get("verification_status")
        if status == "verified_current_manufacturer_page":
            if row.get("ingredients") != product.get("ingredients"):
                errors.append(f"{slug}: ingredient list differs between product data and ledger")
        elif status == "manufacturer_page_missing_complete_ingredient_panel":
            if row.get("ingredients") is not None:
                errors.append(f"{slug}: unverified formulation should not store ledger ingredients")
            if not product.get("manufacturerDescriptionMentions"):
                errors.append(f"{slug}: missing-panel record should preserve clearly labeled manufacturer-description mentions")
        else:
            errors.append(f"{slug}: unexpected formulation verification status {status!r}")

        if not product.get("formulationSource"):
            errors.append(f"{slug}: missing formulationSource")

        if not product.get("formulationStatus"):
            errors.append(f"{slug}: missing formulationStatus")

        if product.get("evidenceGrade") != "Under Review":
            errors.append(f"{slug}: evidence grade should remain Under Review until adjudicated")

    for slug in ledger:
        if slug not in products:
            errors.append(f"{slug}: ledger contains product absent from products-data.json")

    evidence = evidence_doc.get("ingredients", {})
    for ingredient_slug, item in evidence.items():
        for product_slug in item.get("products", []):
            if product_slug not in products:
                errors.append(
                    f"{ingredient_slug}: references unknown product {product_slug}"
                )
        if not item.get("sources"):
            errors.append(f"{ingredient_slug}: has no authoritative/primary sources")

        ingredient_page = ROOT / "ingredients" / f"{ingredient_slug}.html"
        if not ingredient_page.exists():
            errors.append(f"{ingredient_slug}: missing published ingredient HTML page")

        for source in item.get("sources", []):
            url = source.get("url", "")
            if not url.startswith("https://"):
                errors.append(f"{ingredient_slug}: source URL is not HTTPS: {url!r}")

        allowed_directness = {
            "Direct human evidence",
            "Relevant human evidence",
            "Preliminary human evidence",
            "Mechanistic evidence",
        }
        source_pmids = {
            str(source.get("pmid"))
            for source in item.get("sources", [])
            if source.get("pmid")
        }
        required_review_fields = {
            "title", "pmid", "study_type", "population", "evidence_scope",
            "finding", "limitations", "directness", "verified_at", "url"
        }
        for i, review in enumerate(item.get("review_evidence", []), 1):
            missing = sorted(k for k in required_review_fields if not review.get(k))
            if missing:
                errors.append(
                    f"{ingredient_slug}: review_evidence[{i}] missing fields: {', '.join(missing)}"
                )
                continue
            pmid = str(review.get("pmid"))
            if not re.fullmatch(r"\d+", pmid):
                errors.append(f"{ingredient_slug}: review_evidence[{i}] invalid PMID {pmid!r}")
            if pmid not in source_pmids:
                errors.append(
                    f"{ingredient_slug}: review_evidence[{i}] PMID {pmid} is not present in sources"
                )
            if not str(review.get("url", "")).startswith("https://"):
                errors.append(f"{ingredient_slug}: review_evidence[{i}] URL is not HTTPS")
            if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", str(review.get("verified_at", ""))):
                errors.append(
                    f"{ingredient_slug}: review_evidence[{i}] verified_at must be YYYY-MM-DD"
                )
            if review.get("directness") not in allowed_directness:
                errors.append(
                    f"{ingredient_slug}: review_evidence[{i}] unsupported directness {review.get('directness')!r}"
                )

    if len(evidence) != 34:
        errors.append(f"expected 34 current ingredient evidence records, found {len(evidence)}")

    # Public product data should not reintroduce merchant pricing.
    def walk(obj, path="root"):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if "price" in key.lower():
                    errors.append(f"{path}.{key}: product-facing data contains a price field")
                walk(value, f"{path}.{key}")
        elif isinstance(obj, list):
            for i, value in enumerate(obj):
                walk(value, f"{path}[{i}]")

    walk(products_doc)

    money_pattern = re.compile(r"\$\s*\d")
    for md_path in (ROOT / "products").glob("*.md"):
        text = md_path.read_text(encoding="utf-8")
        if money_pattern.search(text):
            errors.append(f"{md_path.name}: product Markdown contains a displayed dollar price")

    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        f"VALIDATION PASSED: {len(products)} products; "
        f"{len(evidence)} ingredient evidence records."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
