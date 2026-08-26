// Regression tests for .github/workflows/deploy.yml — specifically the
// "Verify GitHub Pages is enabled" pre-flight step added in this PR.
//
// The workflow itself is only interpretable by the GitHub Actions runner,
// so rather than parse full YAML semantics we assert on the literal,
// load-bearing pieces of the step (job placement, ordering, the curl
// invocation, the failure condition, and the operator-facing error text).
//
// Run with: node --test tests/deploy-workflow.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.join(__dirname, "..", ".github", "workflows", "deploy.yml");
const workflow = readFileSync(workflowPath, "utf8");

/** Slice out the `deploy:` job block (from its header to end of file). */
function deployJobBlock(src) {
  const idx = src.indexOf("\n  deploy:\n");
  assert.notEqual(idx, -1, "expected a top-level `deploy:` job in the workflow");
  return src.slice(idx);
}

describe("deploy.yml — Verify GitHub Pages is enabled step", () => {
  const deployJob = deployJobBlock(workflow);

  test("step exists inside the deploy job", () => {
    assert.match(deployJob, /- name: Verify GitHub Pages is enabled/);
  });

  test("runs before the actual Deploy to GitHub Pages step", () => {
    const verifyIdx = deployJob.indexOf("Verify GitHub Pages is enabled");
    const deployIdx = deployJob.indexOf("Deploy to GitHub Pages");
    assert.ok(verifyIdx !== -1 && deployIdx !== -1, "both steps must be present");
    assert.ok(verifyIdx < deployIdx, "pre-flight check must run before actions/deploy-pages");
  });

  test("queries the GitHub Pages API for this repository with an authenticated request", () => {
    assert.match(deployJob, /curl -s -o \/dev\/null -w "%\{http_code\}"/);
    assert.match(deployJob, /Authorization: Bearer \$\{\{ github\.token \}\}/);
    assert.match(deployJob, /Accept: application\/vnd\.github\+json/);
    assert.match(
      deployJob,
      /https:\/\/api\.github\.com\/repos\/\$\{\{ github\.repository \}\}\/pages/
    );
  });

  test("treats HTTP 404 as 'Pages not enabled' and fails the job", () => {
    assert.match(deployJob, /if \[ "\$status" = "404" \]; then/);
    assert.match(deployJob, /\bexit 1\b/);
  });

  test("prints an actionable, human-readable fix on failure", () => {
    assert.match(deployJob, /::error::GitHub Pages is NOT enabled on this repository/);
    assert.match(deployJob, /::error::Fix: open https:\/\/github\.com\/\$\{\{ github\.repository \}\}\/settings\/pages/);
    assert.match(deployJob, /Source.*to 'GitHub Actions'/);
    assert.match(deployJob, /Re-run failed jobs/);
  });

  test("prints a positive confirmation when Pages is already enabled", () => {
    assert.match(deployJob, /GitHub Pages is enabled \(API status \$\{status\}\)\./);
  });

  test("the exit-1 failure branch is scoped to the 404 check, not the whole step", () => {
    // Guard against a regression where `exit 1` fires unconditionally.
    const ifBlock = deployJob.match(/if \[ "\$status" = "404" \]; then([\s\S]*?)fi/);
    assert.ok(ifBlock, "expected an if/fi block guarding the exit 1");
    assert.match(ifBlock[1], /exit 1/);
  });
});
