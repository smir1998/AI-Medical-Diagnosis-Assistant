/* ------------------------------------------------------------------ */
/*  Tests for README.md — the Model Registry row/table and the QA      */
/*  Bench case-count bump, cross-checked against the real source of     */
/*  truth in src/data/medical.ts (and, textually, src/lib/tests.ts).    */
/* ------------------------------------------------------------------ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HF_MODEL_ZOO } from "../src/data/medical.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const README = readFileSync(path.join(__dirname, "../README.md"), "utf8");
const TESTS_TS = readFileSync(path.join(__dirname, "../src/lib/tests.ts"), "utf8");

describe("README.md — What's inside table", () => {
  test("QA Bench row advertises the current case count", () => {
    const match = README.match(/\*\*QA Bench\*\*\s*\|\s*(\d+)-case in-browser regression suite/);
    assert.ok(match, "QA Bench row not found in expected format");
    const advertised = Number(match[1]);
    const actualCaseCount = [...TESTS_TS.matchAll(/id:\s*"[A-Z]\d+"/g)].length;
    assert.equal(advertised, actualCaseCount, `README says ${advertised} cases, tests.ts defines ${actualCaseCount}`);
  });

  test("QA Bench row mentions the new HF model-registry integrity check", () => {
    const row = README.match(/\*\*QA Bench\*\*.*$/m)?.[0] ?? "";
    assert.match(row, /model-registry integrity/i);
  });

  test("a Model Registry row exists and is linked to the model pages", () => {
    assert.match(README, /\*\*Model Registry\*\*\s*\|\s*Verified Hugging Face Hub lineage/);
  });
});

describe("README.md — Model lineage table", () => {
  function lineageRows() {
    const start = README.indexOf("## Model lineage");
    const end = README.indexOf("## System architecture");
    assert.ok(start !== -1 && end !== -1 && start < end, "Model lineage section not found");
    const section = README.slice(start, end);
    // Column 2 is a markdown link: [`<label>`](<url>). The label is sometimes an
    // abbreviated form of the repo id, so the full id is read from the URL instead.
    return [...section.matchAll(/\|\s*([^|]+?)\s*\|\s*\[`([^`]+)`\]\(https:\/\/huggingface\.co\/([^)]+)\)\s*\|/g)];
  }

  test("has exactly one row per HF_MODEL_ZOO entry", () => {
    assert.equal(lineageRows().length, HF_MODEL_ZOO.length);
  });

  test("every row's link resolves to a repo id that exists in HF_MODEL_ZOO", () => {
    const knownIds = new Set(HF_MODEL_ZOO.map((m) => m.repoId));
    for (const [, , label, repoId] of lineageRows()) {
      assert.ok(knownIds.has(repoId), `README row "${label}" links to unknown model "${repoId}"`);
    }
  });

  test("every HF_MODEL_ZOO entry is linked from exactly one README row", () => {
    const linkedIds = lineageRows().map(([, , , repoId]) => repoId);
    assert.equal(new Set(linkedIds).size, linkedIds.length, "a model is linked more than once");
    for (const m of HF_MODEL_ZOO) {
      assert.ok(linkedIds.includes(m.repoId), `HF_MODEL_ZOO entry "${m.repoId}" is not linked from the README`);
    }
  });

  test("covers every console head named in HF_MODEL_ZOO.role at least once", () => {
    const rows = lineageRows();
    const consoleHeads = rows.map(([, head]) => head.trim());
    // "Radiology + Derm heads" in the data is represented as a single "Vision foundation" row in the README.
    assert.ok(consoleHeads.includes("Radiology Lab"));
    assert.ok(consoleHeads.includes("Derm Scan"));
    assert.ok(consoleHeads.includes("Symptom Lab"));
    assert.ok(consoleHeads.includes("NLP Desk"));
  });
});

describe("README.md — internal consistency", () => {
  test("does not resurrect the removed MODEL_CARDS terminology", () => {
    assert.doesNotMatch(README, /MODEL_CARDS/);
  });

  test("mentions Hugging Face at least in the table and the dedicated section", () => {
    const occurrences = README.match(/Hugging Face/g) ?? [];
    assert.ok(occurrences.length >= 2, `expected >=2 mentions of "Hugging Face", found ${occurrences.length}`);
  });
});
