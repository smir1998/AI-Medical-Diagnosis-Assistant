/* ------------------------------------------------------------------ */
/*  Tests for the "MODEL ZOO" cases added to src/lib/tests.ts (the      */
/*  in-app QA bench regression suite).                                  */
/*                                                                       */
/*  src/lib/tests.ts transitively imports React components that use     */
/*  JSX (Chatbot.tsx, DermScan.tsx, PatientRegistry.tsx) and extension-  */
/*  less relative specifiers meant to be resolved by Vite's bundler, so  */
/*  it cannot be loaded directly by plain Node. Instead this file:       */
/*    1. statically verifies the new case shapes via the source text,    */
/*       and checks the whole battery for id collisions, and             */
/*    2. re-runs the exact validation predicates the M1/M2 cases use     */
/*       against the real, directly-importable HF_MODEL_ZOO data, both   */
/*       on the real (should pass) data and on deliberately broken       */
/*       (should fail) fixtures, to pin down the pass/fail boundary.     */
/* ------------------------------------------------------------------ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HF_MODEL_ZOO } from "../src/data/medical.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(path.join(__dirname, "../src/lib/tests.ts"), "utf8");

describe("src/lib/tests.ts — structure of the MODEL ZOO cases", () => {
  test("imports HF_MODEL_ZOO from the data module", () => {
    assert.match(SOURCE, /import\s*{[^}]*HF_MODEL_ZOO[^}]*}\s*from\s*["']\.\.\/data\/medical["']/);
  });

  test("the Case suite union includes MODEL ZOO", () => {
    assert.match(SOURCE, /suite:\s*"SYMPTOM NLP"[\s\S]*"MODEL ZOO"/);
  });

  test("defines case M1 (repo id / metadata integrity) under suite MODEL ZOO", () => {
    const m1 = SOURCE.match(/id:\s*"M1"[\s\S]{0,400}/);
    assert.ok(m1, "M1 case not found");
    assert.match(m1[0], /suite:\s*"MODEL ZOO"/);
    assert.match(m1[0], /HF_MODEL_ZOO/);
  });

  test("defines case M2 (head coverage) under suite MODEL ZOO", () => {
    const m2 = SOURCE.match(/id:\s*"M2"[\s\S]{0,400}/);
    assert.ok(m2, "M2 case not found");
    assert.match(m2[0], /suite:\s*"MODEL ZOO"/);
    assert.match(m2[0], /vision/);
  });

  test("every case id in the battery is unique (no duplicate QA-bench rows)", () => {
    const ids = [...SOURCE.matchAll(/id:\s*"([A-Z]\d+)"/g)].map((m) => m[1]);
    assert.ok(ids.length > 0, "no case ids found — regex may be stale");
    assert.equal(new Set(ids).size, ids.length, `duplicate ids found: ${ids.join(",")}`);
  });

  test("the battery grew by exactly two cases (M1, M2) for this PR", () => {
    const ids = [...SOURCE.matchAll(/id:\s*"([A-Z]\d+)"/g)].map((m) => m[1]);
    const modelZooIds = ids.filter((id) => id.startsWith("M"));
    assert.deepEqual(modelZooIds.sort(), ["M1", "M2"]);
  });
});

/** Mirrors the M1 predicate in src/lib/tests.ts (see the id:"M1" case). */
function m1Passes(zoo) {
  const bad = zoo.find(
    (m) => !/^[\w.-]+\/[\w.-]+$/.test(m.repoId) || !m.arch.trim() || !m.dataset.trim() || !m.metric.trim()
  );
  return !bad && zoo.length >= 5;
}

/** Mirrors the M2 predicate in src/lib/tests.ts (see the id:"M2" case). */
function m2Passes(zoo) {
  const tags = zoo.map((m) => m.tag);
  const vision = tags.filter((t) => t === "vision").length;
  return vision >= 2 && tags.includes("nlp") && tags.includes("llm") && tags.includes("multimodal");
}

describe("M1 predicate — HF entry integrity", () => {
  test("passes against the real HF_MODEL_ZOO shipped in this PR", () => {
    assert.equal(m1Passes(HF_MODEL_ZOO), true);
  });

  test("fails when a repo id is malformed", () => {
    const broken = HF_MODEL_ZOO.map((m, i) => (i === 0 ? { ...m, repoId: "not-a-valid-id" } : m));
    assert.equal(m1Passes(broken), false);
  });

  test("fails when arch/dataset/metric is blank", () => {
    for (const field of ["arch", "dataset", "metric"]) {
      const broken = HF_MODEL_ZOO.map((m, i) => (i === 0 ? { ...m, [field]: "   " } : m));
      assert.equal(m1Passes(broken), false, `expected failure when ${field} is blank`);
    }
  });

  test("fails when fewer than 5 models are registered", () => {
    assert.equal(m1Passes(HF_MODEL_ZOO.slice(0, 4)), false);
  });
});

describe("M2 predicate — console head coverage", () => {
  test("passes against the real HF_MODEL_ZOO shipped in this PR", () => {
    assert.equal(m2Passes(HF_MODEL_ZOO), true);
  });

  test("fails when the multimodal foundation model is missing", () => {
    assert.equal(
      m2Passes(HF_MODEL_ZOO.filter((m) => m.tag !== "multimodal")),
      false
    );
  });

  test("fails when only one vision model remains", () => {
    const oneVisionRemoved = HF_MODEL_ZOO.filter((m) => m.tag !== "vision").concat(
      HF_MODEL_ZOO.find((m) => m.tag === "vision")
    );
    assert.equal(m2Passes(oneVisionRemoved), false);
  });
});
