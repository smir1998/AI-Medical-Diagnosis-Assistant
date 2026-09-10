// Regression tests for the App.tsx / InfoSections.tsx wiring changes in this
// PR. This project has no component-rendering test harness (no React
// Testing Library / jsdom is installed), so these tests validate the
// checked-in source as text — guarding against accidental reverts of the
// import, render, and copy changes introduced by this PR.
//
// Run with:  node --test tests/component-wiring.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const appTsx = readFileSync(path.join(repoRoot, "src", "App.tsx"), "utf8");
const infoSections = readFileSync(path.join(repoRoot, "src", "components", "InfoSections.tsx"), "utf8");

describe("src/App.tsx — ModelRegistry wiring", () => {
  test("imports ModelRegistry alongside the other info sections", () => {
    const importLine = appTsx
      .split("\n")
      .find((l) => l.includes('from "./components/InfoSections"'));
    assert.ok(importLine, "InfoSections import line not found");
    assert.match(importLine, /\bModelRegistry\b/);
    assert.match(importLine, /\bEvaluation\b/);
    assert.match(importLine, /\bFieldNotes\b/);
    assert.match(importLine, /\bInsideModel\b/);
  });

  test("renders <ModelRegistry /> between Evaluation and FieldNotes", () => {
    const evalIdx = appTsx.indexOf("<Evaluation />");
    const registryIdx = appTsx.indexOf("<ModelRegistry />");
    const notesIdx = appTsx.indexOf("<FieldNotes />");
    assert.ok(evalIdx !== -1 && registryIdx !== -1 && notesIdx !== -1, "one of the three sections is not rendered");
    assert.ok(evalIdx < registryIdx && registryIdx < notesIdx, "ModelRegistry must render between Evaluation and FieldNotes");
  });

  test("footer STACK & LINEAGE tags mention the HF model zoo and drop the stale 'Keras-style pipeline' tag", () => {
    const tagsLine = appTsx
      .split("\n")
      .find((l) => l.includes("STACK & LINEAGE") === false && l.includes('"CNN"') && l.includes("Grad-CAM"));
    assert.ok(tagsLine, "STACK & LINEAGE tag list not found");
    assert.match(tagsLine, /"HF Model Zoo"/);
    assert.doesNotMatch(tagsLine, /Keras-style pipeline/);
  });
});

describe("src/components/InfoSections.tsx — ModelRegistry component", () => {
  test("imports HF_MODEL_ZOO instead of the removed MODEL_CARDS export", () => {
    const importLine = infoSections
      .split("\n")
      .find((l) => l.includes('from "../data/medical"'));
    assert.ok(importLine, "data/medical import line not found");
    assert.match(importLine, /\bHF_MODEL_ZOO\b/);
    assert.doesNotMatch(importLine, /\bMODEL_CARDS\b/);
  });

  test("exports a ModelRegistry component", () => {
    assert.match(infoSections, /export function ModelRegistry\s*\(/);
  });

  test("ModelRegistry maps HF_MODEL_ZOO entries into Hub links", () => {
    const start = infoSections.indexOf("export function ModelRegistry");
    assert.ok(start !== -1);
    const body = infoSections.slice(start, infoSections.indexOf("\n/* ---------- field notes", start));
    assert.match(body, /HF_MODEL_ZOO\.map/);
    assert.match(body, /href=\{`https:\/\/huggingface\.co\/\$\{m\.repoId\}`\}/);
    assert.match(body, /target="_blank"/);
    assert.match(body, /rel="noopener noreferrer"/);
  });

  test("TAG_STYLE covers every tag variant used by HFModel (vision, nlp, llm, multimodal)", () => {
    const start = infoSections.indexOf("const TAG_STYLE");
    assert.ok(start !== -1, "TAG_STYLE map not found");
    const block = infoSections.slice(start, infoSections.indexOf("};", start));
    for (const tag of ["vision", "nlp", "llm", "multimodal"]) {
      assert.match(block, new RegExp(`${tag}:\\s*"`), `TAG_STYLE missing a style for tag "${tag}"`);
    }
  });

  test("Evaluation section no longer renders the removed per-model metric cards grid", () => {
    const start = infoSections.indexOf("export function Evaluation");
    const end = infoSections.indexOf("export function ModelRegistry");
    assert.ok(start !== -1 && end !== -1 && start < end);
    const body = infoSections.slice(start, end);
    assert.doesNotMatch(body, /MODEL_CARDS/);
    assert.match(body, /Model Registry/);
  });
});
