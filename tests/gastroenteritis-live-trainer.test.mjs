import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  CONSOLE_TO_VOCAB,
  DISEASE_SYMPTOM_MATRIX,
} from "../src/data/diseaseSymptomDataset.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsSourcePath = path.join(repoRoot, "src/lib/tests.ts");
const trainSourcePath = path.join(repoRoot, "src/lib/train.ts");

let tempDir;
let trainModel;
let predictWithModel;

before(async () => {
  // Production uses Vite-style extensionless TypeScript imports. Point only that
  // import at the real dataset file so Node's type-stripping test runner can load
  // and execute the otherwise-unchanged trainer implementation.
  tempDir = await mkdtemp(path.join(tmpdir(), "medlens-trainer-test-"));
  const source = await readFile(trainSourcePath, "utf8");
  const datasetUrl = pathToFileURL(
    path.join(repoRoot, "src/data/diseaseSymptomDataset.ts")
  ).href;
  const runnableSource = source.replace(
    'from "../data/diseaseSymptomDataset"',
    `from "${datasetUrl}"`
  );
  assert.notEqual(runnableSource, source, "trainer dataset import was not found");

  const runnablePath = path.join(tempDir, "train.ts");
  await writeFile(runnablePath, runnableSource);
  ({ trainModel, predictWithModel } = await import(pathToFileURL(runnablePath).href));
});

after(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("Gastroenteritis disease profile", () => {
  test("keeps one profile with the intended training-core order and nausea evidence", () => {
    const profiles = DISEASE_SYMPTOM_MATRIX.filter(
      ({ disease }) => disease === "Gastroenteritis"
    );

    assert.equal(profiles.length, 1);
    assert.deepEqual(profiles[0].symptoms, [
      "vomiting",
      "diarrhea",
      "nausea",
      "sunken eyes",
      "dehydration",
    ]);
    assert.equal(new Set(profiles[0].symptoms).size, profiles[0].symptoms.length);
  });

  test("maps every L4 console symptom to its matching profile feature", () => {
    const profile = DISEASE_SYMPTOM_MATRIX.find(
      ({ disease }) => disease === "Gastroenteritis"
    );
    assert.ok(profile);

    const mapped = ["vomiting", "diarrhea", "nausea"].map(
      (id) => CONSOLE_TO_VOCAB[id]
    );
    assert.deepEqual(mapped, ["vomiting", "diarrhea", "nausea"]);
    assert.ok(mapped.every((symptom) => profile.symptoms.includes(symptom)));
  });
});

describe("Gastroenteritis live-trainer regression", () => {
  let model;

  before(async () => {
    model = await trainModel({ epochs: 24, rowsPerClass: 32 });
  });

  test("ranks Gastroenteritis first for vomiting, diarrhea, and nausea", () => {
    const predictions = predictWithModel(model, [
      "vomiting",
      "diarrhea",
      "nausea",
    ]);

    assert.equal(predictions[0]?.name, "Gastroenteritis");
    assert.ok(predictions.length > 1, "L4 reporting requires a runner-up");
    assert.ok(predictions[0].prob > predictions[1].prob);
    assert.ok(
      Math.abs(predictions.reduce((sum, { prob }) => sum + prob, 0) - 1) < 1e-12,
      "prediction probabilities should form a distribution"
    );
  });

  test("ignores duplicate evidence without changing the prediction", () => {
    const symptoms = ["vomiting", "diarrhea", "nausea"];
    const baseline = predictWithModel(model, symptoms);
    const duplicated = predictWithModel(model, [
      "vomiting",
      "diarrhea",
      "nausea",
      "nausea",
    ]);

    assert.deepEqual(duplicated, baseline);
  });

  test("returns no predictions when none of the symptom ids are recognized", () => {
    assert.deepEqual(predictWithModel(model, []), []);
    assert.deepEqual(predictWithModel(model, ["not-a-console-symptom"]), []);
  });
});

describe("L4 QA-bench reporting", () => {
  let l4Source;

  before(async () => {
    const source = await readFile(testsSourcePath, "utf8");
    const start = source.indexOf('id: "L4"');
    assert.notEqual(start, -1, "L4 case was not found");
    l4Source = source.slice(start, source.indexOf("\n  },", start) + 5);
  });

  test("runs the deterministic trainer against the complete symptom triad", () => {
    assert.match(l4Source, /trainModel\(\{ epochs: 24, rowsPerClass: 32 \}\)/);
    assert.match(
      l4Source,
      /predictWithModel\(m, \["vomiting", "diarrhea", "nausea"\]\)/
    );
    assert.match(l4Source, /top\.name === "Gastroenteritis"/);
  });

  test("reports both the winner and runner-up when the case passes", () => {
    assert.match(l4Source, /top=Gastroenteritis/);
    assert.match(l4Source, /top\.prob/);
    assert.match(l4Source, /runner-up \$\{second\.name\}/);
    assert.match(l4Source, /second\.prob/);
  });

  test("reports the observed result and expectation when the case fails", () => {
    assert.match(l4Source, /top\?\.name \?\? "∅"/);
    assert.match(l4Source, /top\?\.prob \?\? 0/);
    assert.match(l4Source, /expected Gastroenteritis/);
  });
});
