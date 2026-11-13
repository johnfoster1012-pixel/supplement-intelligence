import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import worker from "../src/index";
import { checkClaim, compareLabel, labelInput, studies } from "../src/verify";

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
    const trial = await call("check_supplement_claim", {
      ingredient: "uva-ursi",
      outcome: "urinary symptoms",
      claim:
        "Uva ursi was shown to be equivalent to fosfomycin for urinary symptoms in women with suspected uncomplicated UTI.",
    });
    assert.equal(trial.status, "exaggerated");
    assert.equal(trial.reviewed_studies[0].study_id, "PMID:34111592");
    assert.equal(trial.grade, null);
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
        serving_size: "2 capsules",
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
    { basis: undefined },
    { blend_total_only: true },
    { amount_per_serving: undefined },
  ])
    assert.equal(run(fields), "not_comparable");
});
