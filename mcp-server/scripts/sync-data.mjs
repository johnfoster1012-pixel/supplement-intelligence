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
