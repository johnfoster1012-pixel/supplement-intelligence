import * as z from "zod/v4";
import { identities, norm, type Catalog } from "./search";
import raw from "../evidence/outcomes.json";

const field = z.string().trim().min(1).max(300);
const positive = z.number().positive().finite();
const assessment = z.object({
  claim: field,
  verdict: z.enum([
    "supported_with_limits",
    "exaggerated",
    "contradicted",
    "insufficient",
  ]),
  grade: z.enum(["A", "B", "C"]).nullable(),
  rationale: z.string().min(1),
});
export const studySchema = z.object({
  study_id: field,
  citation: z.object({title: z.string().min(1), authors: z.string().min(1), journal: field, year: z.number().int(), doi: field}),
  source_access: z.enum(["full_text", "primary_study_abstract"]),
  safety_findings: z.string().min(1),
  ingredient: field,
  outcome: field,
  terms: z.array(field).min(1),
  preparation: field,
  preparation_detail: field,
  amount_mg_per_day: positive.nullable(),
  amount_basis: field,
  schedule: field.nullable(),
  duration_days: positive.nullable(),
  design: field,
  n_randomized: positive.int().nullable(),
  n_completed: positive.int().nullable(),
  population: field,
  comparator: field.nullable(),
  effect: z
    .object({
      measure: field,
      estimate: z.number().optional(),
      unit: field.optional(),
      active_percent: z.number().nullable(),
      control_percent: z.number().nullable(),
      time_days: positive.nullable(),
      confidence_interval: field.nullable(),
    })
    .nullable(),
  limitations: z.string().min(1),
  last_evidence_review: z.iso.date().nullable(),
  source: z.url(),
  locator: field,
  source_verified_at: z.iso.date(),
  editorial_status: z.enum(["reviewed", "pending_review"]),
  assessments: z.array(assessment),
});
export const studies = z.array(studySchema).parse(raw);
export const claimInput = z.object({
  claim: z.string().trim().min(1).max(600),
  ingredient: field.optional(),
  outcome: field,
  product: field.optional(),
});
export const labelInput = z.object({
  product: field.optional(),
  serving_size: field.optional(),
  servings_per_day: positive.optional(),
  source: field.optional(),
  claims: z.array(field).max(10).default([]),
  ingredients: z
    .array(
      z.object({
        name: field,
        form: field.optional(),
        amount_per_serving: positive.optional(),
        unit: z.enum(["g", "mg", "mcg"]).optional(),
        basis: z.enum(["elemental", "compound", "extract", "other"]).optional(),
        blend_total_only: z.boolean().default(false),
        unreadable: z.boolean().default(false),
        label_text: field.optional(),
      }),
    )
    .min(1)
    .max(50),
});
const link = (s: string) =>
  "https://supplement-intelligence.com/ingredients/" + s;
function candidates(term: string, cat: Catalog) {
  const hits = identities(term, cat);
  const exact = hits.filter(
    ([s, x]) => norm(s) === norm(term) || norm(x.name) === norm(term),
  );
  return exact.length ? exact : hits;
}
export function checkClaim(
  input: z.infer<typeof claimInput>,
  cat: Catalog,
  db = studies,
  products: Catalog = {},
) {
  const hits = candidates(input.ingredient ?? "", cat);
  const base = {
    claim: input.claim,
    requested_outcome: input.outcome,
    tracked_product: productContext(input.product, products),
    product: input.product ?? null,
    finished_product_evidence: "not_assessed",
    scope: "reviewed catalog only",
  };
  if (hits.length !== 1)
    return {
      ...base,
      status: "needs_clarification",
      grade: null,
      candidates: hits.map(([s]) => s),
      conclusion:
        "Identify the ingredient or preparation on the label to check this claim.",
    };
  const [slug, row] = hits[0],
    outcome = norm(input.outcome);
  const matching = db.filter(
    (x) => x.ingredient === slug && x.terms.some((t) => norm(t) === outcome),
  );
  const approved = matching.filter((x) => x.editorial_status === "reviewed");
  // Exact reviewed claims only. Do not normalize negation, decimals, units or comparisons.
  const exact =
    !input.product && norm(input.ingredient) === norm(slug)
      ? approved.flatMap((x) =>
          x.assessments
            .filter((a) => a.claim === input.claim)
            .map((a) => ({ ...a, study_id: x.study_id })),
        )
      : [];
  const reviews = (
    Array.isArray(row.review_evidence) ? row.review_evidence : []
  ).filter(
    (r) =>
      outcome &&
      (" " + norm(r.evidence_scope) + " ").includes(" " + outcome + " "),
  );
  return {
    ...base,
    ingredient: slug,
    canonical_url: link(slug),
    safety: row.safety ?? null,
    product_directness: row.product_directness ?? null,
    last_ingredient_review: row.last_reviewed_at ?? null,
    coverage: approved.length
      ? "outcome_studies_available"
      : reviews.length
        ? "related_review_only"
        : "no_reviewed_outcome_match",
    status: exact.length === 1 ? exact[0].verdict : "not_assessed",
    grade: exact.length === 1 ? exact[0].grade : null,
    conclusion:
      exact.length === 1
        ? exact[0].rationale
        : "The reviewed catalog does not establish this exact wording, amount of effect, and product scope.",
    reviewed_assessments: exact,
    reviewed_studies: approved,
    related_review_summaries: reviews,
    pending_source_reviews: matching.length - approved.length,
    grade_note:
      "Only explicitly reviewed grades are returned. An ungraded claim is not grade C.",
    limitation:
      "A related review or ingredient study is context, not verification of a specific percentage or finished product.",
  };
}
function productContext(name: string | undefined, products: Catalog) {
  const key = norm(name);
  const hit =
    key &&
    Object.entries(products).find(
      ([slug, row]) => norm(slug) === key || norm(row.name) === key,
    );
  return hit
    ? {
        slug: hit[0],
        catalog_url: "https://supplement-intelligence.com/products/" + hit[0],
        formulation_source: hit[1].formulationSource ?? null,
        formulation_status: hit[1].formulationStatus ?? null,
        catalog_evidence_status: hit[1].evidenceGrade ?? null,
        notice:
          "Manufacturer information describes the tracked formulation. Verify that the supplied label is the same version.",
      }
    : null;
}
export function compareLabel(
  input: z.infer<typeof labelInput>,
  cat: Catalog,
  db = studies,
  products: Catalog = {},
) {
  return {
    label: input,
    tracked_product: productContext(input.product, products),
    provenance: "user-supplied label; not independently verified",
    finished_product_evidence: "not_assessed",
    claims_status: "Claims are reproduced as supplied; check each separately.",
    rows: input.ingredients.map((item) => {
      const hits = candidates(item.name, cat),
        base = { label_name: item.name, requested_form: item.form ?? null };
      if (item.unreadable || hits.length !== 1)
        return {
          ...base,
          status: item.unreadable
            ? "clarify_unreadable_label"
            : hits.length
              ? "ambiguous_identity"
              : "not_in_catalog",
          candidates: hits.map(([s]) => s),
        };
      const [slug, x] = hits[0];
      const daily =
        item.blend_total_only ||
        !input.serving_size ||
        !item.amount_per_serving ||
        !item.unit ||
        !input.servings_per_day
          ? null
          : item.amount_per_serving *
            { g: 1000, mg: 1, mcg: 0.001 }[item.unit] *
            input.servings_per_day;
      const matches = db
        .filter(
          (r) => r.ingredient === slug && r.editorial_status === "reviewed",
        )
        .map((r) => {
          const sameForm =
            !!item.form && norm(item.form) === norm(r.preparation);
          const conflictingForm =
            norm(item.name) !== norm(slug) &&
            identities(item.name, cat).length > 0 &&
            norm(item.name).startsWith(norm(slug) + " ") &&
            !norm(item.form).includes(norm(item.name));
          const comparable =
            !conflictingForm &&
            sameForm &&
            daily !== null &&
            item.basis === r.amount_basis &&
            r.amount_mg_per_day !== null;
          return {
            study_id: r.study_id,
            safety_findings: r.safety_findings,
            limitations: r.limitations,
            form_description_matches: sameForm,
            amount_comparison: comparable
              ? daily === r.amount_mg_per_day
                ? "same_daily_mass"
                : "different_daily_mass"
              : "not_comparable",
            outcome: r.outcome,
            preparation: r.preparation,
            preparation_detail: r.preparation_detail,
            population: r.population,
            duration_days: r.duration_days,
            studied_mg_per_day: r.amount_mg_per_day,
            source: r.source,
          };
        });
      return {
        ...base,
        status: "ingredient_found",
        ingredient: slug,
        source: link(slug),
        studied_context: x.studied_context,
        research_sources: x.sources,
        safety: x.safety ?? null,
        label_mg_per_day: daily,
        quantity_status: item.blend_total_only
          ? "individual_amount_undisclosed"
          : daily === null
            ? "incomplete_serving_or_amount"
            : "label_mass_only",
        reviewed_comparisons: matches,
        limitation:
          "Matching label text or daily mass does not verify chemical equivalence or efficacy. No comparison means no structured reviewed match in this catalog.",
      };
    }),
  };
}
