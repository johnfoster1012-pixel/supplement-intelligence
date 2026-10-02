#!/usr/bin/env python3
"""Validate Supplement Intelligence current product and evidence data.

This script does not generate medical claims or product formulations.
It checks internal consistency between products-data.json and the
product-label verification ledger.
"""

from pathlib import Path
import json
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

    for slug, product in products.items():
        row = ledger.get(slug)
        if not row:
            errors.append(f"{slug}: missing label-verification ledger row")
            continue

        if row.get("verification_status") != "verified_current_manufacturer_page":
            errors.append(f"{slug}: formulation is not marked verified")

        if row.get("ingredients") != product.get("ingredients"):
            errors.append(f"{slug}: ingredient list differs between product data and ledger")

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
