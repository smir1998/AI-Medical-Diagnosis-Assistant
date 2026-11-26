import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [readme, notice] = await Promise.all([
  readFile(path.join(repoRoot, "README.md"), "utf8"),
  readFile(path.join(repoRoot, "public/DATASET-NOTICE.md"), "utf8"),
]);

describe("README reflects the current educational app", () => {
  test("states intended use and clinical limits", () => {
    assert.match(readme, /educational demonstration/i);
    assert.match(readme, /not a medical device, diagnostic tool/);
    assert.match(readme, /not been clinically validated/i);
  });

  test("documents current feature behavior without advertising removed modules", () => {
    assert.match(readme, /hand-weighted relative scores/);
    assert.match(readme, /densenet121-res224-all/);
    assert.match(readme, /returns 18 independent findings/);
    assert.match(readme, /FracAtlas-trained orthopedic model/);
    assert.match(readme, /class activation map/);
    assert.match(readme, /inference runs in the browser/);
    assert.match(readme, /separate multinomial logistic model/);
    assert.match(readme, /does not power Symptom Lab/);
    assert.match(readme, /matches keywords to a small static set of educational answers/);
    assert.match(readme, /clear-all control/);
    for (const stale of ["44-case QA bench", "Derm Scan", "Keras", "CNN analysis", "production model per head"]) {
      assert.doesNotMatch(readme, new RegExp(stale, "i"));
    }
  });

  test("documents bundled dataset size and links its attribution notice", () => {
    assert.match(readme, /4,920 rows, 41 labels, and 131 unique symptom features/);
    assert.match(readme, /\[dataset notice\]\(public\/DATASET-NOTICE\.md\)/);
    assert.match(notice, /CC BY-SA 4\.0/);
  });

  test("includes local development and production build commands", () => {
    assert.match(readme, /npm ci/);
    assert.match(readme, /npm run dev/);
    assert.match(readme, /npm run build/);
  });
});
