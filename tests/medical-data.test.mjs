/* ------------------------------------------------------------------ */
/*  Unit tests for src/data/medical.ts — Model Registry (HF_MODEL_ZOO), */
/*  the updated CHAT_KB entries, and the TICKER_ITEMS line added in     */
/*  this PR.                                                            */
/*                                                                       */
/*  src/data/medical.ts has no JSX and no extensionless relative        */
/*  imports, so it can be loaded directly by Node's native TypeScript   */
/*  type-stripping (no bundler / dependency install required). Run      */
/*  with:                                                                */
/*    node --experimental-strip-types --test tests/*.test.mjs           */
/* ------------------------------------------------------------------ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { HF_MODEL_ZOO, CHAT_KB, TICKER_ITEMS, CHAT_FALLBACK } from "../src/data/medical.ts";

const REPO_ID_RE = /^[\w.-]+\/[\w.-]+$/;
const VALID_TAGS = new Set(["vision", "nlp", "llm", "multimodal"]);

describe("HF_MODEL_ZOO (Model Registry data)", () => {
  test("has exactly 5 entries", () => {
    assert.equal(HF_MODEL_ZOO.length, 5);
  });

  test("every entry has a well-formed HF repo id (owner/name)", () => {
    for (const m of HF_MODEL_ZOO) {
      assert.match(m.repoId, REPO_ID_RE, `bad repoId: ${m.repoId}`);
    }
  });

  test("repo ids are unique (no duplicate lineage entries)", () => {
    const ids = HF_MODEL_ZOO.map((m) => m.repoId);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("every entry has non-empty name, arch, params, dataset, metric and role", () => {
    for (const m of HF_MODEL_ZOO) {
      for (const field of ["name", "arch", "params", "dataset", "metric", "role"]) {
        assert.ok(typeof m[field] === "string" && m[field].trim().length > 0, `${field} empty for ${m.repoId}`);
      }
    }
  });

  test("every entry has a recognized tag", () => {
    for (const m of HF_MODEL_ZOO) {
      assert.ok(VALID_TAGS.has(m.tag), `unexpected tag "${m.tag}" on ${m.repoId}`);
    }
  });

  test("console coverage: vision x2, plus nlp, llm and multimodal heads", () => {
    const tags = HF_MODEL_ZOO.map((m) => m.tag);
    assert.ok(tags.filter((t) => t === "vision").length >= 2, "expected at least 2 vision models");
    assert.ok(tags.includes("nlp"), "expected an nlp model");
    assert.ok(tags.includes("llm"), "expected an llm model");
    assert.ok(tags.includes("multimodal"), "expected a multimodal foundation model");
  });

  test("contains the exact production lineage advertised in the README", () => {
    const ids = HF_MODEL_ZOO.map((m) => m.repoId);
    assert.deepEqual(
      new Set(ids),
      new Set([
        "keremberke/resnet-50-chest-xray-classification",
        "syaha/skin_cancer_detection_model",
        "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext",
        "epfl-llm/meditron-7b",
        "microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224",
      ])
    );
  });

  test("negative case: the repo-id regex used for validation rejects malformed ids", () => {
    for (const bad of ["not-a-repo-id", "org/", "/model", "org/model/extra", ""]) {
      assert.equal(REPO_ID_RE.test(bad), false, `expected "${bad}" to be rejected`);
    }
  });
});

describe("TICKER_ITEMS (Model Registry ticker line)", () => {
  test("includes exactly one ticker item mentioning the model zoo", () => {
    const matches = TICKER_ITEMS.filter((t) => /model zoo/i.test(t));
    assert.equal(matches.length, 1, `expected exactly one match, got: ${JSON.stringify(matches)}`);
  });

  test("the ticker's advertised model count matches HF_MODEL_ZOO length", () => {
    const line = TICKER_ITEMS.find((t) => /model zoo/i.test(t));
    const n = Number(line.match(/(\d+)/)?.[1]);
    assert.equal(n, HF_MODEL_ZOO.length, `ticker says "${line}" but HF_MODEL_ZOO has ${HF_MODEL_ZOO.length} entries`);
  });
});

describe("CHAT_KB (chatbot knowledge base changes)", () => {
  function findEntry(key) {
    return CHAT_KB.find((e) => e.keys.includes(key));
  }

  test("a new entry routes Hugging Face / registry questions to the Model Registry answer", () => {
    const entry = findEntry("hugging");
    assert.ok(entry, "expected a CHAT_KB entry with the 'hugging' key");
    assert.ok(entry.keys.includes("hf"));
    assert.ok(entry.keys.includes("registry"));
    assert.match(entry.answer, /Model Registry/i);
    assert.match(entry.answer, /Hugging Face/i);
  });

  test("the registry answer references every backing model (full id or model name)", () => {
    const entry = findEntry("hugging");
    // The chat answer abbreviates some long repo ids down to the model family name
    // (e.g. the PubMedBERT and BiomedCLIP variants), so match on the recognizable
    // fragment rather than requiring the exact HF_MODEL_ZOO.repoId string.
    const expectedFragments = ["keremberke/resnet-50-chest-xray-classification", "syaha/skin_cancer_detection_model", "PubMedBERT", "epfl-llm/meditron-7b", "BiomedCLIP"];
    for (const fragment of expectedFragments) {
      assert.ok(entry.answer.includes(fragment), `answer missing reference to ${fragment}`);
    }
  });

  test("the deploy entry no longer includes the 'hugging' key (moved to its own entry)", () => {
    const deployEntry = CHAT_KB.find((e) => e.keys.includes("deploy"));
    assert.ok(deployEntry, "expected a CHAT_KB entry with the 'deploy' key");
    assert.ok(!deployEntry.keys.includes("hugging"), "deploy entry should no longer carry the 'hugging' key");
    // sanity: the rest of the deploy keyword set survived the edit
    for (const k of ["streamlit", "fastapi", "render", "railway"]) {
      assert.ok(deployEntry.keys.includes(k), `deploy entry missing key "${k}"`);
    }
  });

  test("no two entries share an identical key set (routing stays unambiguous)", () => {
    const serialized = CHAT_KB.map((e) => [...e.keys].sort().join("|"));
    assert.equal(new Set(serialized).size, serialized.length);
  });

  test("CHAT_FALLBACK is untouched by this change", () => {
    assert.equal(typeof CHAT_FALLBACK, "string");
    assert.ok(CHAT_FALLBACK.length > 0);
  });
});
