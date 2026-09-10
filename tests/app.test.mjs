/* ------------------------------------------------------------------ */
/*  Tests for src/App.tsx — wiring in the new <ModelRegistry /> section */
/*  and the "STACK & LINEAGE" footer tag list update.                   */
/*                                                                       */
/*  App.tsx contains JSX and cannot be executed directly by plain Node  */
/*  in this dependency-free sandbox (no bundler / JSX transform is      */
/*  installed). These tests validate the composition contract at the    */
/*  source level instead.                                               */
/* ------------------------------------------------------------------ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8");

describe("App.tsx — ModelRegistry wiring", () => {
  test("imports ModelRegistry alongside the other InfoSections", () => {
    assert.match(SOURCE, /import\s*{[^}]*\bEvaluation\b[^}]*\bFieldNotes\b[^}]*\bInsideModel\b[^}]*\bModelRegistry\b[^}]*}\s*from\s*["']\.\/components\/InfoSections["']/);
  });

  test("renders <ModelRegistry /> between <Evaluation /> and <FieldNotes />", () => {
    const evalIdx = SOURCE.indexOf("<Evaluation />");
    const registryIdx = SOURCE.indexOf("<ModelRegistry />");
    const fieldNotesIdx = SOURCE.indexOf("<FieldNotes />");
    assert.ok(evalIdx !== -1, "<Evaluation /> not rendered");
    assert.ok(registryIdx !== -1, "<ModelRegistry /> not rendered");
    assert.ok(fieldNotesIdx !== -1, "<FieldNotes /> not rendered");
    assert.ok(evalIdx < registryIdx && registryIdx < fieldNotesIdx, "expected order: Evaluation, ModelRegistry, FieldNotes");
  });

  test("ModelRegistry is rendered exactly once", () => {
    const matches = SOURCE.match(/<ModelRegistry \/>/g) ?? [];
    assert.equal(matches.length, 1);
  });
});

describe("App.tsx — footer STACK & LINEAGE tags", () => {
  function stackTags() {
    const marker = "STACK & LINEAGE";
    const start = SOURCE.indexOf(marker);
    assert.ok(start !== -1, "STACK & LINEAGE marker not found");
    const arrayMatch = SOURCE.slice(start).match(/\[([^\]]*)\]\.map/);
    assert.ok(arrayMatch, "tag array not found after STACK & LINEAGE marker");
    return [...arrayMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  }

  test("includes the new 'HF Model Zoo' tag", () => {
    assert.ok(stackTags().includes("HF Model Zoo"));
  });

  test("no longer advertises the removed 'Keras-style pipeline' tag", () => {
    assert.ok(!stackTags().includes("Keras-style pipeline"));
  });

  test("keeps the core ML/stack tags intact", () => {
    const tags = stackTags();
    for (const t of ["CNN", "Transfer Learning", "Computer Vision", "NLP", "Softmax", "Grad-CAM", "React", "TypeScript"]) {
      assert.ok(tags.includes(t), `expected tag "${t}" to remain`);
    }
  });

  test("tag list has no duplicates", () => {
    const tags = stackTags();
    assert.equal(new Set(tags).size, tags.length);
  });
});
