/* ------------------------------------------------------------------ */
/*  Tests for src/components/InfoSections.tsx — the new ModelRegistry   */
/*  section and the reworked Evaluation panel (MODEL_CARDS grid         */
/*  removed in favor of a "PRODUCTION LINEAGE" pointer to the new       */
/*  registry).                                                          */
/*                                                                       */
/*  InfoSections.tsx contains JSX, which plain Node cannot parse, and   */
/*  this sandbox has no installed bundler/JSX-transform or React        */
/*  testing toolchain. These tests therefore validate the component's   */
/*  contract at the source level: imports, exported functions, and the  */
/*  literal markup fragments a renderer would need to produce the       */
/*  behavior described in the PR. Combined with the medical-data tests  */
/*  (which validate HF_MODEL_ZOO itself), this pins down that every     */
/*  registry card is driven by real, verified data.                     */
/* ------------------------------------------------------------------ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HF_MODEL_ZOO } from "../src/data/medical.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(path.join(__dirname, "../src/components/InfoSections.tsx"), "utf8");

describe("InfoSections.tsx — imports", () => {
  test("imports HF_MODEL_ZOO instead of the removed MODEL_CARDS", () => {
    assert.match(SOURCE, /import\s*{[^}]*HF_MODEL_ZOO[^}]*}\s*from\s*["']\.\.\/data\/medical["']/);
    assert.doesNotMatch(SOURCE, /MODEL_CARDS/);
  });
});

describe("InfoSections.tsx — Evaluation() no longer renders per-model cards", () => {
  test("the old 4-card model grid (grid-cols-2 map over MODEL_CARDS) is gone", () => {
    const evalBody = SOURCE.slice(SOURCE.indexOf("export function Evaluation"), SOURCE.indexOf("export function ModelRegistry"));
    assert.doesNotMatch(evalBody, /sm:grid-cols-2/);
    assert.doesNotMatch(evalBody, /DermaScan/);
    assert.doesNotMatch(evalBody, /SymptomEncoder/);
    assert.doesNotMatch(evalBody, /NLP-Triage/);
  });

  test("Evaluation() now points readers at the Model Registry", () => {
    const evalBody = SOURCE.slice(SOURCE.indexOf("export function Evaluation"), SOURCE.indexOf("export function ModelRegistry"));
    assert.match(evalBody, /PRODUCTION LINEAGE/);
    assert.match(evalBody, /Model Registry/);
    assert.match(evalBody, /PneumoNet v3/);
  });
});

describe("InfoSections.tsx — ModelRegistry()", () => {
  const registryBody = SOURCE.slice(SOURCE.indexOf("export function ModelRegistry"), SOURCE.indexOf("export function FieldNotes"));

  test("is exported as a standalone component", () => {
    assert.match(SOURCE, /export function ModelRegistry\(\)/);
  });

  test("maps over HF_MODEL_ZOO to render one card per model", () => {
    assert.match(registryBody, /HF_MODEL_ZOO\.map\(/);
  });

  test("links each card to the correct Hugging Face model page", () => {
    assert.match(registryBody, /href=\{`https:\/\/huggingface\.co\/\$\{m\.repoId\}`\}/);
    assert.match(registryBody, /target="_blank"/);
    assert.match(registryBody, /rel="noopener noreferrer"/);
  });

  test("card body surfaces the model's arch, params, dataset and headline metric", () => {
    for (const field of ["m.arch", "m.params", "m.dataset", "m.metric", "m.name", "m.role"]) {
      assert.ok(registryBody.includes(field), `expected ModelRegistry markup to reference ${field}`);
    }
  });

  test("TAG_STYLE covers every tag value present in HF_MODEL_ZOO", () => {
    const tagStyleMatch = SOURCE.match(/const TAG_STYLE:[^=]*=\s*{([^}]*)}/);
    assert.ok(tagStyleMatch, "TAG_STYLE map not found");
    const declaredTags = [...tagStyleMatch[1].matchAll(/(\w+):/g)].map((m) => m[1]);
    for (const m of HF_MODEL_ZOO) {
      assert.ok(declaredTags.includes(m.tag), `TAG_STYLE missing a style for tag "${m.tag}"`);
    }
  });

  test("includes the Transformers.js / hand-rolled-head disclaimer", () => {
    assert.match(registryBody, /Transformers\.js/);
  });
});
