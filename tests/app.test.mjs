import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(repoRoot, file), "utf8");

describe("active application wiring", () => {
  test("App renders only the current console modules and registers model references", async () => {
    const source = await read("src/App.tsx");
    for (const component of ["StatusBar", "PatientRegistry", "SymptomChecker", "ImageAnalysis", "Chatbot", "ReportPanel", "ModelRegistry", "TrainingGrounds"]) {
      assert.match(source, new RegExp(`import \\{[^}]*\\b${component}\\b[^}]*\\} from`));
    }
    assert.match(source, /<ModelRegistry\s*\/>/);
    assert.match(source, /<TrainingGrounds\s+onTrained=\{/);
    assert.doesNotMatch(source, /<DermScan\s*\/>|<Evaluation\s*\/>|<FieldNotes\s*\/>/);
  });

  test("report state is associated with a patient snapshot and hidden on chart mismatch", async () => {
    const source = await read("src/App.tsx");
    assert.match(source, /interface AnalysisReport\s*\{[\s\S]*patientId: string \| null[\s\S]*patient: Patient \| null/);
    assert.match(source, /report\.patientId === activePatientId/);
    assert.match(source, /previous analysis belongs to/);
  });

  test("clearing the demo registry also clears active chart and report", async () => {
    const app = await read("src/App.tsx");
    const registry = await read("src/components/PatientRegistry.tsx");
    assert.match(app, /const handleClearAllPatients = \(\) => \{\s*setPatients\(\[\]\);\s*setActivePatientId\(null\);\s*setReport\(null\);/);
    assert.match(app, /onClearAll=\{handleClearAllPatients\}/);
    assert.match(registry, /Demo data only/);
    assert.match(registry, /window\.confirm\(/);
    assert.match(registry, /CLEAR ALL/);
  });

  test("app and image outputs explicitly identify educational simulation", async () => {
    const app = await read("src/App.tsx");
    const image = await read("src/components/ImageAnalysis.tsx");
    const report = await read("src/components/ReportPanel.tsx");
    assert.match(app, /not a clinical decision-support tool/i);
    assert.match(image, /does not inspect image pixels or run a trained model/i);
    assert.match(image, /Run demo simulation/);
    assert.match(report, /Educational simulation only/);
  });
});
