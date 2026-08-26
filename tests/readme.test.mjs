// Regression tests for README.md — specifically the Model Registry table
// and modules-table row added in this PR, cross-checked against the real
// data source (src/data/medical.ts) so the docs can't silently drift from
// the code.
//
// Run with: node --test tests/readme.test.mjs

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");
const testsSource = readFileSync(path.join(repoRoot, "src", "lib", "tests.ts"), "utf8");

let HF_MODEL_ZOO;

before(async () => {
  ({ HF_MODEL_ZOO } = await import(path.join(repoRoot, "src", "data", "medical.ts")));
});

describe("README.md — modules table", () => {
  test("QA Bench row claims 26 cases and mentions the new HF-registry check", () => {
    assert.match(
      readme,
      /\|\s*\*\*QA Bench\*\*\s*\|\s*26-case in-browser regression suite\s*\|/
    );
    assert.match(readme, /HF model-registry integrity/);
  });

  test("QA Bench's claimed case count never overstates the actual suite size", () => {
    const claimed = Number(readme.match(/(\d+)-case in-browser regression suite/)?.[1]);
    const actualCaseIds = testsSource.match(/id:\s*"[A-Z]\d+"/g) ?? [];
    assert.ok(Number.isFinite(claimed), "README should state an N-case count");
    assert.ok(
      claimed <= actualCaseIds.length,
      `README claims ${claimed} cases but src/lib/tests.ts only defines ${actualCaseIds.length}`
    );
    assert.ok(claimed >= 26, "this PR bumped the documented suite size from 24 to 26 cases");
  });

  test("Model Registry row is present and points readers at the section below", () => {
    assert.match(
      readme,
      /\|\s*\*\*Model Registry\*\*\s*\|\s*Verified Hugging Face Hub lineage\s*\|/
    );
  });
});

describe("README.md — Model lineage (Hugging Face Hub) section", () => {
  test("section heading exists", () => {
    assert.match(readme, /^## Model lineage \(Hugging Face Hub\)$/m);
  });

  function lineageSection(src) {
    const start = src.indexOf("## Model lineage (Hugging Face Hub)");
    const end = src.indexOf("\n## ", start + 1);
    assert.ok(start !== -1, "lineage section must exist");
    return end === -1 ? src.slice(start) : src.slice(start, end);
  }

  test("every HF_MODEL_ZOO entry is linked from the lineage table", () => {
    const section = lineageSection(readme);
    for (const m of HF_MODEL_ZOO) {
      assert.ok(
        section.includes(`https://huggingface.co/${m.repoId}`),
        `expected README to link ${m.repoId}`
      );
    }
  });

  test("lineage table has exactly one data row per registry entry (no drift)", () => {
    const section = lineageSection(readme);
    const rows = section
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && l.includes("huggingface.co"));
    assert.equal(rows.length, HF_MODEL_ZOO.length);
  });
});

describe("README.md — sanity", () => {
  test("still carries the educational-use disclaimer", () => {
    assert.match(readme, /Educational simulation only/);
  });
});
