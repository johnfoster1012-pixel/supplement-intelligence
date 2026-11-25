import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import worker from "../src/index";
import { checkClaim, compareLabel, labelInput, studies } from "../src/verify";

// These fixtures supply no berberine quantity. Check nested text as well as mass fields.
const studyDose = /\d[\d.,]*\s*(?:mg|mcg|µg|g|milligrams?|grams?)\b/i;

test("pending study records retain endpoint units, populations and unknown mass bases", () => {
  for (const [id, basis, endpoint, estimate, unit, days, randomized, completed, population] of [
    ["PMID:18442638", "salt", "HbA1c", -1.99, "percentage points", 91, 36, 31, /15 berberine completers/],
    ["PMID:8828669", "unverified", "Muscle total creatine", 20.28, "mmol/kg dry muscle", 28, null, 9, /nine healthy men/i],
  ] as const) {
    const matches = studies.filter(study => study.study_id === id);
    assert.equal(matches.length, 1, id);
    const [study] = matches;
    assert.equal(study.editorial_status, "pending_review");
    assert.deepEqual(study.assessments, []);
    assert.equal(study.last_evidence_review, null);
    assert.equal(study.amount_mg_per_day, null);
    assert.equal(study.amount_basis, basis);
    assert.equal(study.outcome, endpoint);
    assert.equal(study.effect?.estimate, estimate);
    assert.equal(study.effect?.unit, unit);
    assert.equal(study.effect?.time_days, days);
    assert.equal(study.duration_days, days);
    assert.equal(study.n_randomized, randomized);
    assert.equal(study.n_completed, completed);
    assert.match(study.population, population);
    if (study.ingredient === "berberine") {
      assert.equal(study.schedule, null);
      assert.doesNotMatch(JSON.stringify(study), studyDose);
    }
  }
});

test("worker MCP transport: discovery, retrieval, claim, label and guide responses", async () => {
  const client = new Client({ name: "local-catalog-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("https://local.invalid/mcp"), {
      fetch: async (input, init) => worker.fetch(new Request(input, init), {}),
    }),
  );
  try {
    const call = async (name: string, args: Record<string, unknown>) => {
      const r = await client.callTool({ name, arguments: args });
      assert.ok(!r.isError, JSON.stringify(r.content));
      return r.structuredContent as any;
    };
    assert.ok(
      (await client.listTools()).tools.some(
        (t) => t.name === "compare_supplement_label",
      ),
    );
    const search = async (query: string) =>
      (await call("search_supplement_intelligence", { query })).results;
    const f = await search("Magnesium-Bisglycinate");
    assert.equal(f[0].slug, "magnesium");
    assert.match(f[0].applicability, /separately reviewed/);
    const g = await search("magnesium glycinate");
    assert.equal(g[0].slug, "magnesium");
    assert.ok(
      g.some(
        (x: any) =>
          x.slug === "performance-plus" && x.match_kind === "product_mention",
      ),
    );
    for (const [q, s] of [
      ["Magnesum", "magnesium"],
      ["PERFORMANCE PLUS", "performance-plus"],
      ["Co Q10", "coenzyme-q10"],
      ["vitamin D", "vitamin-d"],
      ["Withania somnifera", "ashwagandha"],
      ["fish oil", "omega-3"],
    ])
      assert.equal((await search(q))[0]?.slug, s, q);
    assert.ok(
      (await search("better sleep")).some((r: any) => r.slug === "valerian"),
    );
    assert.deepEqual(await search("unreviewed imaginary compound"), []);
    assert.deepEqual(await search("palatial"), []);
    const c = await call("check_supplement_claim", {
      claim: "Lowers cortisol by 30%",
      ingredient: "ashwagandha",
      outcome: "cortisol",
      product: "Example",
    });
    assert.equal(c.status, "not_assessed");
    assert.equal(c.grade, null);
    assert.ok(c.related_review_summaries.length);
    assert.ok(!c.reviewed_studies.length);
    assert.equal(
      (
        await call("check_supplement_claim", {
          claim: "Improves sleep",
          outcome: "sleep",
        })
      ).status,
      "needs_clarification",
    );
    const glucose = await call("check_supplement_claim", {
      ingredient: "berberine",
      claim: "Supports healthy blood sugar",
      outcome: "blood glucose",
    });
    assert.equal(glucose.coverage, "related_review_only");
    assert.equal(glucose.status, "not_assessed");
    assert.equal(glucose.grade, null);
    assert.deepEqual(glucose.reviewed_studies, []);
    const review = glucose.related_review_summaries.find(
      (r: { pmid: string }) => r.pmid === "36467075",
    );
    assert.equal(review?.url, "https://pubmed.ncbi.nlm.nih.gov/36467075/");
    assert.match(review.population, /type 2 diabetes/i);
    assert.match(review.limitations, /formulation/);

    const equivalence = await call("check_supplement_claim", {
      ingredient: "berberine",
      claim: "S-BALANCE is as effective as semaglutide.",
      outcome: "glycemic control",
      product: "S-BALANCE",
    });
    assert.equal(equivalence.coverage, "related_review_only");
    assert.equal(equivalence.status, "not_assessed");
    assert.equal(equivalence.grade, null);
    assert.deepEqual(equivalence.reviewed_assessments, []);
    assert.equal(equivalence.finished_product_evidence, "not_assessed");

    for (const [ingredient, outcome, claim] of [
      ["berberine", "HbA1c", "Berberine is equivalent to metformin for HbA1c."],
      ["creatine-monohydrate", "muscle total creatine", "Increases muscle total creatine."],
    ]) {
      const result = await call("check_supplement_claim", { ingredient, outcome, claim });
      assert.equal(result.pending_source_reviews, 1, ingredient);
      assert.deepEqual(result.reviewed_studies, []);
      assert.deepEqual(result.reviewed_assessments, []);
      assert.equal(result.status, "not_assessed");
      assert.equal(result.grade, null);
      assert.equal(result.finished_product_evidence, "not_assessed");
      if (ingredient === "berberine") {
        assert.equal(result.coverage, "related_review_only");
        assert.doesNotMatch(JSON.stringify(result), studyDose);
      }
    }
    const berberineLabel = await call("compare_supplement_label", {
      ingredients: [{ name: "berberine" }],
    });
    assert.equal(berberineLabel.rows[0].label_mg_per_day, null);
    assert.equal(berberineLabel.rows[0].quantity_status, "incomplete_serving_or_amount");
    assert.deepEqual(berberineLabel.rows[0].reviewed_comparisons, []);
    assert.doesNotMatch(JSON.stringify(berberineLabel), studyDose);

    const creatine = await call("compare_supplement_label", {
      servings_per_day: 1,
      ingredients: [
        { name: "creatine monohydrate", amount_per_serving: 3000, unit: "mg" },
      ],
    });
    assert.equal(creatine.rows[0].label_mg_per_day, 3000);
    assert.equal(creatine.rows[0].quantity_status, "label_mass_only");
    assert.match(creatine.rows[0].label_mg_per_day_note, /not a recommended dose/);
    assert.deepEqual(creatine.rows[0].reviewed_comparisons, []);
    assert.equal(creatine.finished_product_evidence, "not_assessed");
    const trial = await call("check_supplement_claim", {
      ingredient: "uva-ursi",
      outcome: "urinary symptoms",
      claim:
        "Uva ursi was shown to be equivalent to fosfomycin for urinary symptoms in women with suspected uncomplicated UTI.",
    });
    assert.equal(trial.status, "exaggerated");
    assert.equal(trial.reviewed_studies[0].study_id, "PMID:34111592");
    assert.equal(trial.grade, null);
    assert.match(trial.reviewed_studies[0].safety_findings, /pyelonephritis/);
    assert.equal(trial.reviewed_studies[0].citation.doi, "10.1016/j.cmi.2021.05.032");
    const horsetail = await call("compare_supplement_label", {
      serving_size: "2 capsules",
      servings_per_day: 1,
      ingredients: [
        {
          name: "horsetail",
          amount_per_serving: 0.9,
          unit: "g",
          basis: "extract",
          form: "Standardized dried Equisetum arvense extract",
        },
      ],
    });
    assert.equal(
      horsetail.rows[0].reviewed_comparisons[0].amount_comparison,
      "same_daily_mass",
    );
    assert.equal(
      horsetail.rows[0].reviewed_comparisons[0].study_id,
      "PMID:24723963",
    );
    for (const [name, args] of [
      ["get_ingredient_evidence", { slug: "magnesium" }],
      ["get_product_formulation", { slug: "performance-plus" }],
      ["list_reviewed_ingredients", {}],
    ] as const) {
      assert.match(
        (await call(name, args)).snapshot_revision,
        /^[a-f0-9]{64}$/,
      );
    }
    const label = await call("compare_supplement_label", {
      product: "PERFORMANCE PLUS",
      serving_size: "2 capsules",
      ingredients: [
        { name: "magnesium glycinate", blend_total_only: true },
        { name: "unknown", unreadable: true },
      ],
    });
    assert.equal(label.tracked_product.slug, "performance-plus");
    assert.equal(label.rows[0].label_mg_per_day, null);
    assert.equal(
      label.rows[0].quantity_status,
      "individual_amount_undisclosed",
    );
    assert.equal(label.rows[1].status, "clarify_unreadable_label");
    assert.ok(
      (
        await call("find_educational_guides", { query: "GLP-1 patches" })
      ).results.some(
        (x: any) =>
          x.url.endsWith("glp-1-patches") &&
          x.content_type === "educational_guide",
      ),
    );
    assert.equal(
      (
        await client.callTool({
          name: "compare_supplement_label",
          arguments: {
            ingredients: [{ name: "unknown", amount_per_serving: -1 }],
          },
        })
      ).isError,
      true,
    );
  } finally {
    await client.close();
  }
});
test("synthetic reviewed decisions require exact wording; pending assessments cannot grade a claim", () => {
  const cat = { example: { name: "Example" } };
  for (const verdict of [
    "supported_with_limits",
    "exaggerated",
    "contradicted",
    "insufficient",
  ] as const) {
    const record = {
      ...studies[0],
      editorial_status: "reviewed" as const,
      ingredient: "example",
      assessments: [
        {
          claim: "Exact example claim.",
          verdict,
          grade: "B" as const,
          rationale: "Synthetic test only.",
        },
      ],
    };
    const inp = {
      ingredient: "example",
      outcome: "cortisol",
      claim: "Exact example claim.",
    };
    assert.equal(checkClaim(inp, cat, [record]).status, verdict);
    for (const changed of [
      { claim: "Not exact example claim." },
      { product: "Example product" },
      { outcome: "sleep" },
    ])
      assert.equal(
        checkClaim({ ...inp, ...changed }, cat, [record]).grade,
        null,
      );
    assert.equal(
      checkClaim(inp, cat, [{ ...record, editorial_status: "pending_review" }])
        .grade,
      null,
    );
  }
});
test("synthetic reviewed study: daily mass comparison requires form, units, basis and serving information", () => {
  const db = [
    {
      ...studies[0],
      ingredient: "example",
      preparation: "TEST",
      editorial_status: "reviewed" as const,
    },
  ];
  const row = {
    name: "example",
    form: "TEST",
    basis: "extract",
    amount_per_serving: 0.3,
    unit: "g",
  };
  const run = (fields = {}, servings: number | undefined = 2) => {
    const result = compareLabel(
      labelInput.parse({
        servings_per_day: servings,
        ingredients: [{ ...row, ...fields }],
      }),
      { example: { name: "Example" } },
      db,
    ).rows[0];
    return "reviewed_comparisons" in result
      ? result.reviewed_comparisons[0]?.amount_comparison
      : undefined;
  };
  assert.equal(run(), "same_daily_mass");
  assert.equal(
    run({ amount_per_serving: 300, unit: "mcg" }),
    "different_daily_mass",
  );
  for (const fields of [
    { form: "Other" },
    { basis: "compound" },
    { basis: "elemental" },
    { basis: undefined },
    { blend_total_only: true },
    { amount_per_serving: undefined },
  ])
    assert.equal(run(fields), "not_comparable");
});

test("broad glycemic queries retrieve specific endpoints without equating them", () => {
  const scopes = ["Fasting plasma glucose", "2-hour postprandial blood glucose", "HbA1c"];
  const cat = { example: {
    name: "Example",
    review_evidence: [
      ...scopes.map(evidence_scope => ({ evidence_scope })),
      { evidence_scope: "Blood sugar", editorial_status: "pending_review" },
    ],
  } };
  const claim = "Equivalent to semaglutide for glucose control.";
  const run = (outcome: string, product?: string) =>
    checkClaim({ ingredient: "example", claim, outcome, product }, cat, []);
  for (const [outcome, expected] of [
    ["blood sugar", scopes], ["Blood glucose.", scopes], ["glycemic control", scopes],
    ["fasting glucose", [scopes[0]]], ["postprandial glucose", [scopes[1]]],
    ["hemoglobin A1c", [scopes[2]]], ["HbA1c", [scopes[2]]],
    ["body weight", []], ["blood glucose variability", []],
  ] as const) {
    const result = run(outcome);
    assert.ok("related_review_summaries" in result);
    assert.deepEqual(result.related_review_summaries.map(r => r.evidence_scope), expected, outcome);
    assert.equal(result.status, "not_assessed");
    assert.equal(result.grade, null);
  }
  const product = run("blood sugar", "Example formula");
  assert.equal(product.finished_product_evidence, "not_assessed");
  assert.equal(product.status, "not_assessed");
});

test("related reviews never authorize a verdict for another endpoint or a pending study", () => {
  const claim = "The synthetic endpoint decreased by 2.5%.";
  const record = {
    ...studies[0], ingredient: "example", terms: ["fasting glucose"],
    editorial_status: "reviewed" as const,
    assessments: [{
      claim,
      verdict: "supported_with_limits" as const,
      grade: "B" as const,
      rationale: "Test fixture.",
    }],
  };
  const cat = { example: { name: "Example", review_evidence: [{ evidence_scope: "Fasting glucose" }] } };
  const input = { ingredient: "example", claim, outcome: "blood sugar" };
  assert.equal(checkClaim(input, cat, [record]).status, "not_assessed");
  for (const changedClaim of [
    "The synthetic endpoint decreased by 25%.",
    "The synthetic endpoint did not decrease by 2.5%.",
  ]) {
    const result = checkClaim({ ...input, outcome: "fasting glucose", claim: changedClaim }, cat, [record]);
    assert.equal(result.status, "not_assessed");
    assert.equal(result.grade, null);
  }
  const pending = checkClaim(
    { ...input, outcome: "fasting glucose" },
    cat,
    [{ ...record, editorial_status: "pending_review" }],
  );
  assert.ok("pending_source_reviews" in pending);
  assert.equal(pending.pending_source_reviews, 1);
  assert.deepEqual(pending.reviewed_studies, []);
  assert.equal(pending.grade, null);
  const missing = checkClaim(input, { example: { name: "Example" } }, []);
  assert.ok("coverage" in missing);
  assert.equal(missing.coverage, "no_reviewed_outcome_match");
  const ambiguous = checkClaim(input, { a: { name: "Example A" }, b: { name: "Example B" } }, []);
  assert.equal(ambiguous.status, "needs_clarification");
  assert.ok("candidates" in ambiguous);
  assert.deepEqual(ambiguous.candidates, ["a", "b"]);
});

test("daily label mass uses explicit units and frequency; blends and unknowns stay unquantified", () => {
  const run = (item: Record<string, unknown>, servings?: number) => {
    const [row] = compareLabel(labelInput.parse({
      servings_per_day: servings, ingredients: [{ name: "example", ...item }],
    }), { example: { name: "Example" } }, []).rows;
    assert.ok("label_mg_per_day" in row);
    assert.deepEqual(row.reviewed_comparisons, []);
    return row;
  };
  assert.equal(run({ amount_per_serving: 3, unit: "g" }, 1).label_mg_per_day, 3000);
  assert.equal(run({ amount_per_serving: 3000, unit: "mg" }, 1).label_mg_per_day, 3000);
  assert.equal(run({ amount_per_serving: 250, unit: "mcg" }, 2).label_mg_per_day, 0.5);
  const mg = { amount_per_serving: 30, unit: "mg" };
  const blend = run({ ...mg, blend_total_only: true }, 1);
  assert.equal(blend.label_mg_per_day, null);
  assert.equal(blend.quantity_status, "individual_amount_undisclosed");
  for (const row of [
    run(mg), run({ unit: "mg" }, 1), run({ amount_per_serving: 30 }, 1),
    run({ amount_per_serving: Number.MAX_VALUE, unit: "g" }, 1),
  ]) {
    assert.equal(row.label_mg_per_day, null);
    assert.equal(row.quantity_status, "incomplete_serving_or_amount");
  }
});
