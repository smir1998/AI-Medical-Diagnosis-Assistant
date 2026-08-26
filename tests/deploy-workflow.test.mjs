// Regression tests for .github/workflows/deploy.yml
//
// This project has no YAML-parsing dependency and the workflow only runs on
// GitHub's runners, so these tests validate the checked-in file as plain
// text using Node's built-in test runner (no extra dependencies required).
//
// Run with:  node --test tests/deploy-workflow.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.join(__dirname, "..", ".github", "workflows", "deploy.yml");
const workflow = readFileSync(workflowPath, "utf8");

// Anchor on the deploy *step*'s unique action reference rather than its
// "name:" text — the workflow's top-level `name:` is also literally
// "Deploy to GitHub Pages", so searching for that string would match the
// wrong (earlier) occurrence.
const DEPLOY_STEP_MARKER = "uses: actions/deploy-pages@v4";

function verifyStepSlice() {
  const start = workflow.indexOf("Verify GitHub Pages is enabled");
  const end = workflow.indexOf(DEPLOY_STEP_MARKER);
  assert.ok(start !== -1, "verify step missing");
  assert.ok(end !== -1, "deploy step missing");
  assert.ok(start < end, "verify step must appear before the deploy step in file order");
  return workflow.slice(start, end);
}

describe("deploy.yml — GitHub Pages verification step", () => {
  test("adds a 'Verify GitHub Pages is enabled' step to the deploy job", () => {
    assert.match(workflow, /name:\s*Verify GitHub Pages is enabled/);
  });

  test("verification step runs before the actual deploy step", () => {
    // Throws via the internal assertions if ordering is wrong.
    verifyStepSlice();
  });

  test("queries the GitHub Pages API for the current repository", () => {
    assert.match(
      workflow,
      /https:\/\/api\.github\.com\/repos\/\$\{\{\s*github\.repository\s*\}\}\/pages/
    );
  });

  test("authenticates the API check with the workflow token", () => {
    assert.match(workflow, /Authorization:\s*Bearer\s*\$\{\{\s*github\.token\s*\}\}/);
  });

  test("fails the job (exit 1) when the Pages API returns 404", () => {
    const verifyStep = verifyStepSlice();
    assert.match(verifyStep, /if\s*\[\s*"\$status"\s*=\s*"404"\s*\]/);
    assert.match(verifyStep, /exit 1/);
  });

  test("error output points contributors at the exact fix (Settings → Pages)", () => {
    const verifyStep = verifyStepSlice();
    assert.match(verifyStep, /::error::/);
    assert.match(verifyStep, /settings\/pages/);
    assert.match(verifyStep, /Build and deployment.*Source.*GitHub Actions/s);
  });

  test("prints a clear success message when Pages is enabled", () => {
    const verifyStep = verifyStepSlice();
    assert.match(verifyStep, /GitHub Pages is enabled/);
  });

  test("checks status via an exact string comparison, not a loose/substring match", () => {
    const verifyStep = verifyStepSlice();
    // Guards against a regression to a fragile pattern like `[[ "$status" == *404* ]]`.
    assert.doesNotMatch(verifyStep, /==\s*\*404\*/);
    assert.match(verifyStep, /"\$status"\s*=\s*"404"/);
  });
});

describe("deploy.yml — unchanged deploy mechanics still intact", () => {
  test("deploy job still uses actions/deploy-pages@v4", () => {
    assert.match(workflow, /uses:\s*actions\/deploy-pages@v4/);
  });

  test("build job still installs, builds with the Pages sub-path base, and uploads the artifact", () => {
    assert.match(workflow, /npm ci --no-audit --no-fund \|\| npm install --no-audit --no-fund/);
    assert.match(workflow, /npm run build -- --base=\.\//);
    assert.match(workflow, /uses:\s*actions\/upload-pages-artifact@v3/);
  });

  test("concurrency still serializes Pages deployments", () => {
    assert.match(workflow, /group:\s*pages/);
    assert.match(workflow, /cancel-in-progress:\s*true/);
  });

  test("deploy job still declares the permissions the Pages API check needs", () => {
    assert.match(workflow, /pages:\s*write/);
    assert.match(workflow, /id-token:\s*write/);
    assert.match(workflow, /contents:\s*read/);
  });
});
