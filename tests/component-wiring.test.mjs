import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(repoRoot, file), "utf8");

describe("current feature components", () => {
  test("model registry maps external references to safe new-tab links", async () => {
    const source = await read("src/components/ModelRegistry.tsx");
    assert.match(source, /HF_MODEL_ZOO\.map/);
    assert.match(source, /https:\/\/huggingface\.co\/\$\{m\.repoId\}/);
    assert.match(source, /target="_blank"/);
    assert.match(source, /rel="noopener noreferrer"/);
    assert.match(source, /not evidence of this demo's accuracy or clinical performance/);
  });

  test("trainer uses bundled dataset rows and documents split limitations", async () => {
    const source = await read("src/components/TrainingGrounds.tsx");
    assert.match(source, /loadDiseaseDataset\(\)/);
    assert.match(source, /trainModel\(\{[\s\S]*dataset,[\s\S]*onEpoch/);
    assert.match(source, /identical profiles stay together/i);
    assert.match(source, /Dataset card · source, labels, split, and limitations/);
    assert.match(source, /not an independent clinical test set/);
    assert.match(source, /model\.metrics\.perClass/);
    assert.match(source, /c\.support/);
  });

  test("dataset notice attributes upstream source and states its separate license", async () => {
    const notice = await read("public/DATASET-NOTICE.md");
    assert.match(notice, /Pranay Patil/);
    assert.match(notice, /CC BY-SA 4\.0/);
    assert.match(notice, /separate from this app's MIT license/);
    assert.match(notice, /not a clinical cohort/);
  });
});
