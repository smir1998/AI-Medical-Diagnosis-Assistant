import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test } from "node:test";

import {
  CONSOLE_TO_VOCAB,
  DISEASE_SYMPTOM_MATRIX,
} from "../src/data/diseaseSymptomDataset.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_SOURCE = readFileSync(path.join(REPO_ROOT, "src/lib/tests.ts"), "utf8");

/**
 * Node's TypeScript type stripping requires explicit extensions, while the app's
 * Vite-oriented modules intentionally omit them. Load an otherwise unchanged
 * copy from the OS temp directory so these tests exercise the real trainer.
 */
async function loadTrainer() {
  const scratch = mkdtempSync(path.join(tmpdir(), "medlens-trainer-"));
  const datasetPath = path.join(scratch, "diseaseSymptomDataset.ts");
  const trainerPath = path.join(scratch, "train.ts");

  try {
    writeFileSync(
      datasetPath,
      readFileSync(path.join(REPO_ROOT, "src/data/diseaseSymptomDataset.ts"), "utf8"),
    );
    writeFileSync(
      trainerPath,
      readFileSync(path.join(REPO_ROOT, "src/lib/train.ts"), "utf8").replace(
        '"../data/diseaseSymptomDataset"',
        '"./diseaseSymptomDataset.ts"',
      ),
    );
    return await import(pathToFileURL(trainerPath).href);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const { predictWithModel, trainModel } = await loadTrainer();

function gastroenteritisProfile() {
  return DISEASE_SYMPTOM_MATRIX.find(({ disease }) => disease === "Gastroenteritis");
}

function l4Source() {
  const start = TESTS_SOURCE.indexOf('id: "L4"');
  const end = TESTS_SOURCE.indexOf("\n  },\n];", start);
  assert.ok(start !== -1 && end !== -1, "L4 test case not found");
  return TESTS_SOURCE.slice(start, end);
}

describe("Gastroenteritis disease/symptom profile", () => {
  test("includes the complete five-symptom profile used by the live trainer", () => {
    assert.deepEqual(gastroenteritisProfile()?.symptoms, [
      "vomiting",
      "diarrhea",
      "nausea",
      "sunken eyes",
      "dehydration",
    ]);
  });

  test("maps every L4 console input to a distinct Gastroenteritis vocabulary feature", () => {
    const profile = gastroenteritisProfile();
    assert.ok(profile, "Gastroenteritis profile is missing");

    const mapped = ["vomiting", "diarrhea", "nausea"].map(
      (symptom) => CONSOLE_TO_VOCAB[symptom],
    );
    assert.deepEqual(mapped, ["vomiting", "diarrhea", "nausea"]);
    assert.equal(new Set(mapped).size, mapped.length);
    assert.ok(mapped.every((symptom) => symptom && profile.symptoms.includes(symptom)));
  });

  test("does not duplicate symptoms in the amended profile", () => {
    const symptoms = gastroenteritisProfile()?.symptoms ?? [];
    assert.equal(new Set(symptoms).size, symptoms.length);
  });
});

describe("L4 live-trainer regression", () => {
  test("ranks Gastroenteritis first and supplies a lower-probability runner-up", async () => {
    const model = await trainModel({ epochs: 24, rowsPerClass: 32 });
    const predictions = predictWithModel(model, ["vomiting", "diarrhea", "nausea"]);

    assert.ok(predictions.length >= 2, "L4 detail requires a runner-up prediction");
    assert.equal(predictions[0].name, "Gastroenteritis");
    assert.ok(predictions[0].prob > predictions[1].prob);
    assert.ok(Math.abs(predictions.reduce((sum, item) => sum + item.prob, 0) - 1) < 1e-12);
  });

  test("returns no predictions when every console symptom is unmapped", async () => {
    const model = await trainModel({ epochs: 1, rowsPerClass: 4 });
    assert.deepEqual(predictWithModel(model, ["unknown", "also_unknown"]), []);
  });

  test("reports runner-up context on success and an explicit expectation on failure", () => {
    const source = l4Source();
    assert.match(source, /const second = preds\[1\]/);
    assert.match(source, /runner-up \$\{second\.name\}/);
    assert.match(source, /top=\$\{top\?\.name \?\? "∅"\}/);
    assert.match(source, /expected Gastroenteritis/);
  });

  test("guards a missing top prediction before reading its probability", () => {
    const source = l4Source();
    assert.match(source, /const ok = !!top && top\.name === "Gastroenteritis"/);
    assert.match(source, /top\?\.prob \?\? 0/);
  });
});
