// Regression tests for the README.md "Model lineage (Hugging Face Hub)"
// section added in this PR. Cross-checks the documentation against the
// actual HF_MODEL_ZOO data source so the two can't silently drift apart.
//
// Run with:  node --test tests/readme-model-registry.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");
const medicalTs = readFileSync(path.join(repoRoot, "src", "data", "medical.ts"), "utf8");

/** Pulls every `repoId: "..."` string literal out of the HF_MODEL_ZOO block. */
function extractRepoIds(source) {
  const start = source.indexOf("export const HF_MODEL_ZOO");
  assert.ok(start !== -1, "HF_MODEL_ZOO export not found in src/data/medical.ts");
  const block = source.slice(start, source.indexOf("\n];", start));
  return [...block.matchAll(/repoId:\s*"([^"]+)"/g)].map((m) => m[1]);
}

describe("README.md — Model Registry section", () => {
  test("introduces the 'Model lineage (Hugging Face Hub)' section", () => {
    assert.match(readme, /## Model lineage \(Hugging Face Hub\)/);
  });

  test("adds a 'Model Registry' row to the module table", () => {
    assert.match(readme, /\|\s*\*\*Model Registry\*\*\s*\|/);
  });

  test("QA Bench row documents HF model-registry integrity coverage", () => {
    const qaBenchRow = readme.split("\n").find((l) => l.includes("**QA Bench**"));
    assert.ok(qaBenchRow, "QA Bench row not found");
    assert.match(qaBenchRow, /HF model-registry integrity/i);
  });

  test("every HF_MODEL_ZOO repo id is documented in the README lineage table", () => {
    const repoIds = extractRepoIds(medicalTs);
    assert.ok(repoIds.length >= 5, "expected at least 5 HF_MODEL_ZOO entries to check against");
    const missing = repoIds.filter((id) => !readme.includes(id));
    assert.deepEqual(missing, [], `README is missing repo ids: ${missing.join(", ")}`);
  });

  test("lineage table links point at huggingface.co for every documented model", () => {
    const section = readme.slice(readme.indexOf("## Model lineage (Hugging Face Hub)"));
    const links = [...section.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
    assert.ok(links.length >= 5, "expected at least 5 model links in the lineage table");
    for (const link of links) {
      assert.match(link, /^https:\/\/huggingface\.co\//, `unexpected non-HF link: ${link}`);
    }
  });
});
