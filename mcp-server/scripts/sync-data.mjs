import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mcpDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(mcpDir, "..");
const dataDir = path.join(mcpDir, "data");

mkdirSync(dataDir, { recursive: true });

for (const file of ["products-data.json", "ingredient-evidence.json"]) {
  const source = path.join(repoRoot, file);
  const destination = path.join(dataDir, file);
  copyFileSync(source, destination);
  console.log(`Synced ${file} -> mcp-server/data/${file}`);
}

// Derive educational guide metadata from the canonical pages, never from model output.
const { readFileSync, readdirSync, writeFileSync } = await import("node:fs");
const guides = readdirSync(path.join(repoRoot, "glp-1"))
  .filter((f) => f.endsWith(".html"))
  .sort()
  .map((f) => {
    const html = readFileSync(path.join(repoRoot, "glp-1", f), "utf8");
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1]?.split(" | ")[0];
    const url = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    if (!title || !url?.startsWith("https://supplement-intelligence.com/glp-1"))
      throw Error("Invalid guide metadata: " + f);
    return {
      title,
      url,
      content_type: "educational_guide",
      review_status: html.includes(
        "not been reviewed by a medically qualified person",
      )
        ? "Page states no medically qualified review"
        : "Formal review not documented",
      literature_search_date:
        html.match(
          /PubMed search(?:es)? run on ([A-Za-z]+ \d{1,2}, \d{4})/,
        )?.[1] ?? null,
      last_evidence_review: null,
    };
  });
writeFileSync(path.join(dataDir, "guides.json"), JSON.stringify(guides));

// Snapshot identity tracks content even when legacy catalog dates are unchanged.
const { createHash } = await import("node:crypto");
const hash = createHash("sha256");
for (const filename of [
  "products-data.json",
  "ingredient-evidence.json",
  "guides.json",
])
  hash.update(filename).update(readFileSync(path.join(dataDir, filename)));
hash.update(readFileSync(path.join(mcpDir, "evidence/outcomes.json")));
writeFileSync(
  path.join(dataDir, "revision.json"),
  JSON.stringify({ id: hash.digest("hex") }),
);
