/* ------------------------------------------------------------------ */
/*  Tests for .github/workflows/deploy.yml — the new "Verify GitHub     */
/*  Pages is enabled" pre-flight step added to the deploy job.          */
/*                                                                       */
/*  No YAML parser is installed in this sandbox, so the workflow is     */
/*  validated at the text/structure level: step ordering, the API call  */
/*  it makes, and the failure-mode messaging it prints on a 404.        */
/* ------------------------------------------------------------------ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(path.join(__dirname, "../.github/workflows/deploy.yml"), "utf8");

/** crude line-based step splitter good enough for structural assertions */
function deployJobBody() {
  const idx = SOURCE.indexOf("\n  deploy:");
  assert.ok(idx !== -1, "deploy job not found");
  return SOURCE.slice(idx);
}

describe("deploy.yml — deploy job structure", () => {
  test("the deploy job still targets the github-pages environment", () => {
    assert.match(deployJobBody(), /environment:\s*\n\s*name:\s*github-pages/);
  });

  test("the Pages pre-flight check runs before the actual deploy step", () => {
    const body = deployJobBody();
    const checkIdx = body.indexOf("Verify GitHub Pages is enabled");
    const deployIdx = body.indexOf("Deploy to GitHub Pages");
    assert.ok(checkIdx !== -1, "pre-flight check step not found");
    assert.ok(deployIdx !== -1, "deploy step not found");
    assert.ok(checkIdx < deployIdx, "pre-flight check must run before the deploy step");
  });

  test("still uses actions/deploy-pages@v4 for the actual deploy", () => {
    assert.match(deployJobBody(), /uses:\s*actions\/deploy-pages@v4/);
  });
});

describe("deploy.yml — Pages pre-flight check step", () => {
  function checkStepBody() {
    const body = deployJobBody();
    const start = body.indexOf("Verify GitHub Pages is enabled");
    const end = body.indexOf("- name: Deploy to GitHub Pages");
    assert.ok(start !== -1 && end !== -1 && start < end);
    return body.slice(start, end);
  }

  test("queries the GitHub Pages API for this repository", () => {
    const step = checkStepBody();
    assert.match(step, /curl/);
    assert.match(step, /api\.github\.com\/repos\/\$\{\{\s*github\.repository\s*\}\}\/pages/);
  });

  test("authenticates the API call with the workflow token", () => {
    assert.match(checkStepBody(), /Authorization:\s*Bearer\s*\$\{\{\s*github\.token\s*\}\}/);
  });

  test("captures only the HTTP status code (no body) via -o /dev/null -w", () => {
    const step = checkStepBody();
    assert.match(step, /-o\s+\/dev\/null/);
    assert.match(step, /-w\s+["']%\{http_code\}["']/);
  });

  test("fails the job with a non-zero exit code when Pages is not enabled (404)", () => {
    const step = checkStepBody();
    assert.match(step, /if\s*\[\s*"\$status"\s*=\s*"404"\s*\]/);
    assert.match(step, /exit 1/);
  });

  test("prints an actionable, human-readable fix pointing at repo Settings → Pages", () => {
    const step = checkStepBody();
    assert.match(step, /::error::/);
    assert.match(step, /settings\/pages/);
    assert.match(step, /Re-run failed jobs/);
  });

  test("logs a success message with the observed status when Pages is enabled", () => {
    assert.match(checkStepBody(), /GitHub Pages is enabled \(API status \$\{status\}\)/);
  });
});

describe("deploy.yml — unrelated job configuration is unchanged", () => {
  test("permissions block still grants pages:write and id-token:write", () => {
    assert.match(SOURCE, /permissions:[\s\S]*pages:\s*write/);
    assert.match(SOURCE, /permissions:[\s\S]*id-token:\s*write/);
  });

  test("the build job is untouched (checkout, setup-node, build, upload-pages-artifact)", () => {
    const buildBody = SOURCE.slice(SOURCE.indexOf("  build:"), SOURCE.indexOf("\n  deploy:"));
    assert.match(buildBody, /actions\/checkout@v4/);
    assert.match(buildBody, /actions\/setup-node@v4/);
    assert.match(buildBody, /npm run build -- --base=\.\//);
    assert.match(buildBody, /actions\/upload-pages-artifact@v3/);
  });
});
