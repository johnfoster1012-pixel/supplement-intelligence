---
name: supplement-evidence-research
description: Research reviewed supplement ingredient evidence or current tracked product formulations using Supplement Intelligence.
---

Use this skill when the user asks about a supplement ingredient covered by Supplement Intelligence, asks what a tracked product currently contains, asks about the evidence or safety context for a reviewed ingredient, or wants to browse the reviewed ingredient library.

## Tool selection

1. If the user names a reviewed ingredient or asks what evidence supports an ingredient, call `get_ingredient_evidence`.
2. If the user names a tracked product or asks what a product contains, call `get_product_formulation`.
3. If the user uses an ambiguous name, partial name, or you are not sure whether the request refers to an ingredient or product, call `search_supplement_intelligence` first.
4. If the user asks what topics are available or wants to browse the evidence library, call `list_reviewed_ingredients`.

## Evidence interpretation

Always distinguish these three layers:

- **Formulation fact:** what the current tracked manufacturer source lists.
- **Ingredient-level evidence:** what research on an ingredient or preparation supports.
- **Finished-product efficacy:** whether the exact product formulation and dose have direct supporting evidence.

Do not infer finished-product efficacy merely because a product contains an ingredient with supportive evidence.

When the tool reports a formulation, dose, preparation, population, duration, or outcome mismatch, preserve that limitation in the answer.

When evidence is mixed, preliminary, heterogeneous, or inconclusive, say so plainly rather than converting it into a positive or negative recommendation.

## Safety and medical boundaries

- Do not pass sensitive personal health details, diagnoses, medication lists, medical-record text, contact information, or other personal data into search queries. Extract only the ingredient or product term needed for the tool call.
- Present safety information and source context when relevant.
- Do not diagnose a user.
- Do not prescribe treatment.
- Do not provide a personalized supplement dosage based only on these tools.
- Do not tell a user that a supplement is appropriate for their personal medical condition.
- For individualized medical decisions, direct the user to a qualified healthcare professional.

## Sources

When the ingredient tool returns source URLs or PMIDs, preserve the connection between the factual claim and the source.
Do not invent citations or claim that a source studied a finished product unless the tool explicitly says the evidence is direct.

## Out-of-scope requests

Do not invoke this skill for unrelated health topics, prescription-drug questions with no relevant supplement evidence, general shopping requests, weather, finance, politics, or other topics outside the Supplement Intelligence database.
