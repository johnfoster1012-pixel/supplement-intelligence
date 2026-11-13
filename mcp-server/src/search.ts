type Row = Record<string, unknown>;
export type Catalog = Record<string, Row>;
export const norm = (x: unknown) =>
  String(x ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const forms: Record<string, string> = {
  "magnesium glycinate": "magnesium",
  "magnesium bisglycinate": "magnesium",
  "magnesium bis glycinate": "magnesium",
  "magnesium citrate": "magnesium",
  "magnesium oxide": "magnesium",
  "magnesium chloride": "magnesium",
  "vitamin d3": "vitamin-d",
  d3: "vitamin-d",
  cholecalciferol: "vitamin-d",
  "citrulline malate": "l-citrulline",
};
const aliases: Record<string, string> = {
  "co q10": "coenzyme-q10",
  coq10: "coenzyme-q10",
  ala: "alpha-lipoic-acid",
  "epa dha": "omega-3",
  "long chain omega 3": "omega-3",
  "fish oil": "omega-3",
  msm: "msm",
  arginine: "l-arginine",
  citrulline: "l-citrulline",
  magnesum: "magnesium",
};
const topics: Record<string, string> = {
  "better sleep": "sleep",
  "trouble sleeping": "sleep",
  "sleep support": "sleep",
};
const stopwords = new Set([
  "and",
  "of",
  "or",
  "the",
  "l",
  "acid",
  "oil",
  "extract",
  "root",
  "long",
  "chain",
  "oral",
  "seed",
  "black",
  "supplement",
]);
function identityName(value: unknown, q: string) {
  if (stopwords.has(q)) return false;
  return phrase(value, q);
}
function phrase(value: unknown, q: string) {
  return !!q && (" " + norm(value) + " ").includes(" " + q + " ");
}
export function identities(query: string, records: Catalog) {
  const q = norm(query);
  return !q
    ? []
    : Object.entries(records).filter(
        ([slug, x]) =>
          norm(slug) === q ||
          norm(x.name) === q ||
          forms[q] === slug ||
          aliases[q] === slug ||
          identityName(x.name, q),
      );
}
export function search(query: string, records: Catalog, products: Catalog) {
  const q = norm(query),
    term = topics[q] ?? q,
    direct = new Set(identities(query, records).map(([s]) => s));
  const ingredients = Object.entries(records)
    .filter(
      ([s, x]) =>
        direct.has(s) || [x.summary, x.posture].some((v) => phrase(v, term)),
    )
    .sort(([a], [b]) => Number(direct.has(b)) - Number(direct.has(a)))
    .slice(0, 20)
    .map(([slug, x]) => ({
      type: "ingredient" as const,
      slug,
      name: String(x.name),
      canonical_url: "https://supplement-intelligence.com/ingredients/" + slug,
      evidence_posture: String(x.posture ?? ""),
      match_kind:
        forms[q] === slug
          ? "related_form"
          : direct.has(slug)
            ? "identity"
            : "topic",
      ...(forms[q] === slug
        ? {
            requested_form: query,
            applicability:
              "Parent ingredient record. Search did not identify a separately reviewed record for this form; general findings cannot establish a form-specific benefit.",
          }
        : {}),
    }));
  const product = Object.entries(products)
    .filter(([s, x]) => [s, x.name, x.ingredients].some((v) => phrase(v, q)))
    .sort(
      ([a, x], [b, y]) =>
        Number(norm(b) === q || norm(y.name) === q) -
        Number(norm(a) === q || norm(x.name) === q),
    )
    .slice(0, 20)
    .map(([slug, x]) => ({
      type: "product" as const,
      slug,
      name: String(x.name),
      canonical_url: "https://supplement-intelligence.com/products/" + slug,
      formulation_status:
        x.formulationStatus == null ? null : String(x.formulationStatus),
      evidence_status: String(x.evidenceGrade ?? "Under Review"),
      match_kind:
        norm(slug) === q || norm(x.name) === q
          ? "product_identity"
          : "product_mention",
    }));
  return [...ingredients, ...product];
}
