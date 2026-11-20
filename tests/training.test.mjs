import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { parseDiseaseDataset } from "../src/lib/diseaseDataset.ts";
import { trainModel } from "../src/lib/train.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("bundled disease dataset training", () => {
  test("parses the shipped source rows and normalized feature vocabulary", async () => {
    const csv = await readFile(path.join(repoRoot, "public/Training.csv"), "utf8");
    const dataset = parseDiseaseDataset(csv);

    assert.equal(dataset.rows.length, 4920);
    assert.equal(new Set(dataset.rows.map((row) => row.disease)).size, 41);
    assert.equal(dataset.symptomVocab.length, 131);
    assert.ok(dataset.rows.every((row) => row.symptoms.length === 131));
    assert.ok(dataset.rows.every((row) => row.symptoms.every((value) => value === 0 || value === 1)));
  });

  test("trains from source rows and reports grouped holdout support", async () => {
    const csv = await readFile(path.join(repoRoot, "public/Training.csv"), "utf8");
    const dataset = parseDiseaseDataset(csv);
    const model = await trainModel({ epochs: 2, dataset });

    assert.equal(model.sourceRows, dataset.rows.length);
    assert.equal(model.classes.length, 41);
    assert.equal(model.symptomVocab.length, 131);
    assert.equal(model.trainingRows + model.metrics.testRows, model.sourceRows);
    assert.ok(model.uniqueProfiles > 0 && model.uniqueProfiles <= model.sourceRows);
    assert.equal(model.metrics.perClass.length, model.classes.length);
    assert.ok(model.metrics.perClass.every((entry) => Number.isInteger(entry.support) && entry.support >= 0));
    assert.equal(
      model.metrics.perClass.reduce((total, entry) => total + entry.support, 0),
      model.metrics.testRows,
    );
    assert.ok(Number.isFinite(model.metrics.accuracy));
    assert.ok(Number.isFinite(model.metrics.macroF1));
  });

  test("rejects conflicting labels for an identical symptom profile", async () => {
    const dataset = {
      symptomVocab: ["fever"],
      rows: [
        { symptoms: [1], disease: "A" },
        { symptoms: [1], disease: "B" },
      ],
    };

    await assert.rejects(
      trainModel({ epochs: 1, dataset }),
      /different labels to the same symptom profile/,
    );
  });
});
