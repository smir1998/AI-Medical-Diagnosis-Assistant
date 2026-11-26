import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { CHAT_FALLBACK, CHAT_KB, HF_MODEL_ZOO, TICKER_ITEMS } from "../src/data/medical.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("medical demo copy and reference data", () => {
  test("external model references have unique valid repository ids and complete metadata", () => {
    assert.ok(HF_MODEL_ZOO.length > 0);
    const ids = HF_MODEL_ZOO.map((model) => model.repoId);
    assert.equal(new Set(ids).size, ids.length);
    for (const model of HF_MODEL_ZOO) {
      assert.match(model.repoId, /^[\w.-]+\/[\w.-]+$/);
      for (const field of ["name", "arch", "params", "dataset", "metric", "role"]) {
        assert.ok(model[field].trim(), `${field} is missing for ${model.repoId}`);
      }
    }
  });

  test("registry labels references and does not attribute external metrics to this app", async () => {
    const source = await readFile(path.join(repoRoot, "src/components/ModelRegistry.tsx"), "utf8");
    assert.match(source, /External model references/);
    assert.match(source, /does not download or run/);
    assert.match(source, /do not describe this app's outputs/);
    assert.match(source, /metrics belong to the linked projects/);
  });

  test("status ticker avoids unsupported clinical performance claims", () => {
    const copy = TICKER_ITEMS.join(" | ");
    assert.match(copy, /educational demonstration/i);
    assert.match(copy, /pixel statistics/i);
    assert.match(copy, /not probabilities/i);
    assert.doesNotMatch(copy, /scans analyzed|accuracy|recall-first/i);
    assert.match(copy, /no clinical validation/i);
  });

  test("chatbot copy describes trained radiology model and clinical limits", () => {
    const answer = (key) => CHAT_KB.find((entry) => entry.keys.includes(key))?.answer ?? "";
    assert.match(answer("cnn"), /pretrained ConvNeXt-Tiny/i);
    assert.match(answer("image"), /pneumonia score/i);
    assert.match(answer("architecture"), /research-only pneumonia model/i);
    assert.match(answer("architecture"), /score is not a diagnosis/i);
    assert.match(answer("validated"), /not.*clinically validated/i);
    assert.match(answer("urgent"), /cannot assess urgency/i);
    assert.match(answer("fever"), /cannot provide personal treatment advice/i);
    assert.match(CHAT_FALLBACK, /can't assess symptoms or give personal medical advice/i);
  });

  test("keyword routes are non-empty and unique", () => {
    const allKeys = CHAT_KB.flatMap((entry) => {
      assert.ok(entry.keys.length > 0 && entry.answer.trim());
      return entry.keys;
    });
    assert.equal(new Set(allKeys).size, allKeys.length);
  });
});
